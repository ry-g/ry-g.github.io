'use strict';
// import * as ML from '/js/lib/ml.min.js';
import {forceCluster, forceCollide} from './core_modules/bcForces.js';
import {dragger, nodeEventHandler, radar} from "./core_modules/eventHandlers.js";
import {
    addBackgroud,
    bPanel,
    getSvg,
    initializeSliders,
    mergeTableBody,
    mergeTip
} from "./core_modules/DOMInitialization.js";

const WIDTH = 960;
const HEIGHT = 540;
const margin = ({top: 15, right: 5, bottom: 15, left: 5});
const PADDING = 5;

// const cat30 = [//https://medialab.github.io/iwanthue/
//     "#87eaff", "#b62300", "#31eb41", "#012fcd", "#a9ff84", "#ae68ff",
//     "#00f59f", "#dc00a5", "#02e7cd", "#cc002f", "#bafffb", "#230034",
//     "#ffb817", "#027fd3", "#ff973c", "#001a47", "#ffe39a", "#1c000d",
//     "#ffdcc9", "#171c00", "#ffbef0", "#4f3e00", "#d2daff", "#360c00",
//     "#ff9fc0", "#028a9f", "#5e001a", "#ffaeae", "#571d00", "#ffa189"]
const cat30 =[//https://mokole.com/palette.html
    "#ff0000", "#ff8c00", "#ffff00", "#7cfc00", "#9400d3", "#00ff7f",
    "#696969", "#dcdcdc", "#8b4513", "#006400", "#808000", "#483d8b",
    "#008b8b", "#9acd32", "#00008b", "#8fbc8f", "#8b008b", "#b03060",
    "#dc143c", "#00ffff", "#00bfff", "#f4a460", "#0000ff", "#f08080",
    "#1e90ff", "#f0e68c", "#90ee90", "#ff1493", "#7b68ee", "#ee82ee",]

const fFormat = d3.format(".2f")
const LABELS = ["acousticness", "danceability", "energy", "instrumentalness", "speechiness", "liveness", "valence"]

function restore(initialData){
    const initialNodeCount = Math.min(1000, initialData.length);
   // const labels=["acousticness", "danceability", "energy", "instrumentalness", "speechiness", "liveness", "valence"]
    const slideMap = new Map(LABELS.map(L=>([L,0.0])))
    // create array of objects containing only track audio features
    const dataFeats = initialData
        .map(d=> ({source:d.source, ...Object.fromEntries(Object.entries(d).filter(([key, ])=>slideMap.has(key)))}))

    const featMap = new Map(dataFeats.map(d=>([d.source, [...Object.values(d).slice(1,)]])))

    // set defaults for threshMap as minimum value to propagate to slider values
    slideMap.forEach((value, key) => slideMap.set(key,d3.min(dataFeats, d=>d[key])))

    const slideGroup = d3.selectAll(".slider-group").data([initialNodeCount,...slideMap.values()])
    slideGroup.select("input").property("value",d=>d)
    slideGroup.select("output").property("value",(d,i)=> i> 0 ? fFormat(d) : d)
    d3.select('#track-count').text(initialNodeCount)
    console.log({slideMap, dataFeats, featMap})
    return [slideMap, dataFeats, featMap]
}

// const nbrData = d3.dsv(",","./data/full.edgelist",(d,i)=>({source: +d.source, target: +d.target, dist: +d.dist}))
const metaData = d3.dsv(";","./data/full_pop50.csv", (d,i)=>({
    source: +d[""],
    id: d.id,
    preview_url: d.preview_url !== "" ? d.preview_url : "NA",
    name: d.name,
    artists: d.artists.replaceAll(/[\[\]']/g,'').split(", "),
    explicit: +d.explicit,
    release_date: d.release_date,
    popularity: +d.popularity,
    duration_ms: +d.duration_ms,
    tempo: +d.tempo,
    acousticness: +d.acousticness,
    danceability: +d.danceability,
    energy: +d.energy,
    instrumentalness: +d.instrumentalness,
    liveness: +d.liveness,
    loudness: +d.loudness,
    speechiness: +d.speechiness,
    valence: +d.valence,
    key: +d.key,
    mode: +d.mode,
    group: +d.group
    }))

Promise.all([metaData]).then(//nbrData
    values => ready(null,...values)
).catch(error => console.log(error))

function ready(error, metaData) {
    const svg = getSvg("div#container", WIDTH, HEIGHT)
    const background = addBackgroud(svg, WIDTH, HEIGHT)
    const netGroup = svg.append("g").attr("class","netgroup")
    let node = netGroup.append("g").attr("class","nodegroup").selectAll(".qnode")
    const zoom = d3.zoom().on("zoom", (event, d) => netGroup.attr("transform",event.transform));
    background.call(zoom);
    const DATALEN = metaData.length
    //console.log({edgeData,metaData})

    //const DSubset = metaData.slice(0,5000) //Pre-slicing the data is **Significantly** faster
    //const DATALEN = DSubset.length
    const nmData = ((n) => JSON.parse(JSON.stringify(metaData.slice(0,n))))
    // This needs to be a function to prevent accidental manipulation of the source data
    //const nmData = ((n) => JSON.parse(JSON.stringify(DSubset.slice(0,n))))
    console.log({"nodeMetaData": nmData})

    let [sliderValMap, dataFeatures, featureMap] = restore(nmData())

    let grpData = ({children: Array.from(d3.group(nmData(), d=> d.group), ([, children])=>({children}))})
    const color = d3.scaleOrdinal(nmData().map(d=>d.group), cat30)

    const pack = (gData) => d3.pack()
        .size([WIDTH/2, HEIGHT/2])
        .padding(1)
        (d3.hierarchy(gData).sum(d => d.similarity))//.sort((a, b) =>  a.value - b.value))//.count())


    let nodes = pack(grpData).leaves();
    console.log({nodes})
    const simulation = d3.forceSimulation(nodes)
        // .force("center", d3.forceCenter(WIDTH / 2,HEIGHT / 2).strength(0.01))
        .force("x", d3.forceX(WIDTH / 2).strength(0.01))
        .force("y", d3.forceY(HEIGHT / 2).strength(0.01))
        .force("cluster", forceCluster(0.4))
        //.force("collide", d3.forceCollide(d=>d.r*2).strength(1))  // this actually works a bit, but no group separation, so purely relies on color
        .force("collide", forceCollide(0.4, 10, 30))
        .force("charge", d3.forceManyBody().strength(d=>d.data.similarity))
        .alphaDecay(0.01)
        .on("tick",tick)


    function extractFeatures(d){
        const v = d?.data??d
        return [v.acousticness, v.danceability, v.energy, v.instrumentalness, v.liveness, v.speechiness, v.valence]
    }

    function getSliderValues(source="valMap"){
        // Maybe change to actual read from slider properties

        //const [nodeMax, ...sliderValues] = d3.selectAll(".slider-group input").nodes().map(d=>+d.value)
        //return [nodeMax, ...sliderValues]
        let returnData;
        if (source==="valMap") {
            returnData = [ +slider.property("value"),...sliderValMap.values()]
        }
        else{
            const [nodeMax, ...sliderValues] = d3.selectAll(".slider-group input").nodes().map(d=>+d.value)
            returnData = [nodeMax, ...sliderValues]
        }
        console.log({returnData})
        return returnData

    }
    function setSliderValues(sliderValues, maxNode=undefined){
        const numNode = maxNode ?? +slider.property("value")
        console.log(sliderValues)
        const slideGroup = d3.selectAll(".slider-group").data([numNode,...sliderValues])
        slideGroup.select("input").property("value",d=>d)
        slideGroup.select("output").property("value",(d,i)=> i> 0 ? fFormat(d) : d)
        d3.zip([...sliderValMap.keys()], sliderValues).forEach(([key,newVal])=>sliderValMap.set(key,newVal))
        d3.select('#track-count').text(numNode)
        update();
    }

    function topN(n){
        const [nMax, ...slideVals] = getSliderValues("valMap")
        const mostSimilar = [...featureMap].map(([k,v])=>[ML.Similarity.cosine(v,slideVals),k])
            .sort((a,b)=>b[0]-a[0]).map(d=>d[1]).slice(0,n)
        return nmData().filter((d,i)=>mostSimilar.includes(i))
    }

    function similarity(d){
        //TODO: Once 100% sure of distance metric, "borrow" implementation from MLjs and remove library to reduce load
        //const slideDist = ML.Distance.euclidean(extractFeatures(d),[...threshMap.values()])
        const slideDist = ML.Similarity.cosine(extractFeatures(d),[...sliderValMap.values()])
        return slideDist
    }

    // const rscale=d3.scalePow().domain([0,1]).range([3,15]).exponent(2)
    // const rscale=d3.scaleLinear().domain([0,1]).range([3,15])

    function refresh(newEdgeData){
        //newEdgeData = newEdgeData ?? nodes.map(d=>d.data)
        newEdgeData.forEach(d => (d.similarity = similarity(d)))
        const rscale=d3.scalePow().domain(d3.extent(newEdgeData,d=>d.similarity)).range([3,15]).exponent(2)
        grpData = ({children: Array.from(d3.group(newEdgeData, d=> d.group), ([, children])=>({children}))})

        const nodePack = pack(grpData)
        simulation.stop();
        let prev = new Map(nodes.map(d=>[d.data.source, d]))
        nodes = nodePack.leaves()

        //TODO: prevent node positions from being recalculated instead of just recalculating and then overwriting
        nodes.map(d=>{
            let prevd = prev.get(d.data.source)
            if (prevd){
                d.x = prevd.x; d.y = prevd.y; d.vx = prevd.vx; d.vy = prevd.vy
            }
        });

        console.log({grpData,nodes})

        node = node.data(nodes[0].parent !== null ? nodes : [], d => d.data)//.source)
            .join(enter => {
                    const grp = enter.append("g").attr("class", "node")
                    grp.append("circle")
                        .attr("r", d => rscale(d.data.similarity))
                        .style("fill", d=>color(d.data.group))//'#f03b20')
                        //.call(circGrow)
                    grp.append("text")
                        .attr("text-anchor","middle")
                        .attr("alignment-baseline","central")
                        .attr('x', 0).attr('y', 0)
                        //-rscale(distance(d)))//function() {return parseFloat(d3.select(this.previousElementSibling).attr('r'))+4})
                        .classed("shadowed --hidden",true)
                        .style("z-index", 1)
                        .text(d=> d.data.name.replace(/ ?-.+/,'').replace(/ ?\(.+ ?\)/,''))
                        //strip "- *" and "(*)" e.g. blah - remastered | blah (featuring foo and bar 1992)
                    return grp
                },
                update => update,
                exit => exit.remove())
            .call(dragger(simulation))
            .call(this_ => nodeEventHandler(this_, simulation))

        simulation.nodes(nodes)
        simulation.alpha(0.1).restart();
        d3.select('#track-count').text(nodes.length)
        d3.select("#track-merge >span").text(d3.selectAll('.frozen').data().length)
    }

    const [slider,slideDiv] = initializeSliders(sliderValMap, DATALEN)
    refresh(nmData(1000))

    const isFilterMode = () => d3.select("#filter-mode > span").classed("--active");

    function clickRestore(event,d) {
        [sliderValMap, dataFeatures, featureMap] = restore(nmData())
        //isFilterMode = false
        d3.select("#filter-mode > span").classed("--active",  false)

        refresh(nmData(1000))
    }
    function clickFilter(event,d){
        //isFilterMode = !isFilterMode
        d3.select("#filter-mode > span").classed("--active", !isFilterMode());
        update();
    }
    function clickMerge(event,d){
        const selData = d3.selectAll('.frozen').data().map(extractFeatures)
        const rowMean = d3.transpose(selData).map(d=>d3.sum(d)/d.length)
        console.log({selData,rowMean})

        const namedMap = selData.map(t=>d3.zip(LABELS,t).map(([axis,value]) => ({axis,value})))

        radar(namedMap, "#merge-tip > .spiderchart");

        mergeTip.transition().duration(200).style("opacity",0.9).style("height", "auto").style("display","initial")
        const tableData = d3.zip(LABELS,rowMean).map(([key,value])=>({key,value}))

        mergeTableBody.selectAll("tr")
            .data(tableData, d=>d.value)
            .join(enter => {
                let tr = enter.append("tr")
                tr.append("th").attr("scope","row").text(d=>d.key)
                tr.append("td").text(d=>d3.format('0.6f')(d.value))
                return tr
            })

        bPanel.selectAll("button")
            .data([rowMean])
            .join("button")
            .attr("type","button")
            .classed("btn btn-light btn-sm",true)
            .on('click',(event,d)=>{
                setSliderValues(d);
            })
            .text("Set Sliders")
    }
    function clickPause(event,d) {
        const alpha = simulation.alpha()
        const iTarget = d3.select(this).selectChild("i")
        const isStopped = iTarget.classed("fa-play")
        if (!isStopped && alpha>0.001){
            simulation.stop();
            iTarget.classed("fa-pause",false).classed("fa-play",true)

        }
        else if (isStopped){
            simulation.alphaTarget(0.05).restart()
            iTarget.classed("fa-play",false).classed("fa-pause",true)

        }

        //console.log(alpha)
        //if (!event.active) simulation.alpha(0.05).restart()
    }

    d3.select("#restore-initial").on('click',clickRestore)
    d3.select("#filter-mode").on('click', clickFilter)
    d3.select("#track-merge").on('click', clickMerge)
    d3.select("#simulation-pause").on('click',clickPause)

    function toLabeled(sliderValues){
        console.assert(sliderValues.length===7)
        return new Map(d3.zip(LABELS, sliderValues))
    }

    function update(){
        const [nodeMax, ...sliderValues] = getSliderValues("raw")
        console.log({nodeMax, sliderValues})
        const namedValues = toLabeled(sliderValues)
        let ndClone = topN(nodeMax)
        if (isFilterMode() === true){
            for (let [key, value] of namedValues) {
                ndClone = ndClone.filter(d => d[key] >= value)
            }
        }
        refresh(ndClone)

    }

    function slideFilter(filterAttr, event, d) {
        //console.log({filterAttr, d})
        const nMax = +slider.property("value")
        d3.select("output#maxnode-out").text(nMax)
        const nVal = +d3.select(event.target).property("value")

        if (filterAttr !== "maxnode"){
            sliderValMap.set(filterAttr,nVal)
            d3.select(event.target.parentNode).select("output").text(fFormat(nVal))
        }
        //simulation.stop()
        // let ndClone = topN(nMax)//nmData(nMax)
        // if (isFilterMode() === true){
        //     for (let [key, value] of sliderValMap) {
        //         ndClone = ndClone.filter(d => d[key] >= value)
        //     }
        // }

        // refresh(ndClone)
        update();
        //simulation.alpha(0.1).restart()
        //console.log({nVal,nodes,links, threshMap})
    }
    console.log({node})
    slider.on("change", (event, d) => slideFilter("maxnode", event, d))
    slideDiv.selectAll("input").on("change", (event, d) => slideFilter(d[0], event, d))


    d3.select('.search-inp').on("input", function (event){
        // if (event.inputType === "deleteContentBackward"){
        //     curinp=curinp.slice(0,-1)
        // } else{
        //     curinp+=event.data
        // }
        const inputText = this.value
        console.log({event,inputText})
        //TODO: Fix this hack and actually filter the nodes non-cosmetically
        node.filter(d=>d.data.name.toLowerCase().includes(inputText.toLowerCase())).selectAll("circle").classed("--hidden",false)
        node.filter(d=>!(d.data.name.toLowerCase().includes(inputText.toLowerCase()))).selectAll("circle").classed("--hidden",true)
        console.log(inputText)

    })


    function tick() {
        node.attr("cx", d => d.x).attr("cy", d => d.y);
        node.attr("transform", d => `translate(${d.x}, ${d.y})`)
    }



}