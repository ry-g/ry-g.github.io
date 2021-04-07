'use strict';
// import * as ML from '/js/lib/ml.min.js';

const WIDTH = 960;
const HEIGHT = 700;
const margin = ({top: 15, right: 5, bottom: 15, left: 5});
const PADDING = 5;

//const nbrData = d3.json("./data/flat_nbrs1k_pop50.json")
const nbrData = d3.json("./data/int_small_nbrs.json")
const metaData = d3.json("./data/int_trackdata_pop50.json")
const nodeData = d3.json("./data/int_nodegroups1k.json")
//const nodeData = d3.json("./data/int_nodegroups.json")
Promise.all([nbrData, metaData, nodeData]).then(
    values => ready(null,...values)
).catch(error => console.log(error))

function getSvg(selector){
    const svg = d3.select(selector)
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet") // This Does NOT break zoom, fine to leave
        .attr("viewBox", [0, 0, WIDTH, HEIGHT])
        //.style("background","#F6F6F6")
        .style("margin", Object.values(margin).join(" "))
        .classed("svg-content", true);
    return svg
}
function addBackgroud(svg){
    const background = svg
        .append("rect")
        .attr("id", "bg")
        .attr("fill", "#F2F7F0")
        .attr("class", "view")
        .attr("x", 0.5)
        .attr("y", 0.5)
        .attr("width", WIDTH - 1)
        .attr("height", HEIGHT - 1)
        //.on("click", () => t.handleBackgroundClicked());
    return background
}

function ready(error, ndata, mdata, nddata) {
    const svg = getSvg("div#container")
    const background = addBackgroud(svg)
    const DATALEN = nddata.length
    // This needs to be a function to prevent accidental manipulation of the source data
    //const nData = (() => JSON.parse(JSON.stringify(ndata)))
    const _mData = new Map(Object.entries(mdata).map(d=>[parseInt(d[0]),d[1]]))
    const _nData = (() => JSON.parse(JSON.stringify(nddata)))
    const _nmData = _nData().map(d=>({...d,..._mData.get(d.source)}))
    const nmData = (() => JSON.parse(JSON.stringify(_nmData)))
    const threshMap = new Map([["acousticness",0.0], ["danceability",0.0], ["energy",0.0],
        ["instrumentalness",0.0], ["liveness",0.0], ["speechiness",0.0], ["valence",0.0]]);

    //console.log({"neighborData": nData})
    //console.log({"metaData": mData})
    console.log({"nodeMetaData": nmData})
    //console.log({"nodeData": ndData()})
    let grpData = ({children: Array.from(d3.group(nmData(), d=> d.group), ([, children])=>({children}))})
    const color = d3.scaleOrdinal(nmData().map(d=>d.group), d3.schemeCategory10)

    let nodes;// = [];
    // let links = [];
    function centroid(nodes) {
        let x = 0, y = 0, z = 0;
        for (const d of nodes) {
            let k = d.r ** 2;
            x += d.x * k;
            y += d.y * k;
            z += k;
        }
        return {x: x / z, y: y / z};
    }
    console.log({centroid})

    const pack = (gData) => d3.pack()
        .size([WIDTH/2, HEIGHT/2])
        .padding(1)
        (d3.hierarchy(gData)
            .sum(d => distance(d)))

    function forceCollide() {
        const alpha = 0.4; // fixed for greater rigidity!
        const padding1 = 5; // separation between same-color nodes
        const padding2 = 15; // separation between different-color nodes
        let nodes;
        let maxRadius;

        function force() {
            const quadtree = d3.quadtree(nodes, d => d.x, d => d.y);
            //console.log({quadtree})
            for (const d of nodes) {
                const r = d.r + maxRadius;
                const nx1 = d.x - r,
                    ny1 = d.y - r,
                    nx2 = d.x + r,
                    ny2 = d.y + r;
                quadtree.visit((q, x1, y1, x2, y2) => {
                    if (!q.length) do {
                        if (q.data !== d) {
                            const r = d.r + q.data.r + (d.data.group === q.data.data.group ? padding1 : padding2);
                            let x = d.x - q.data.x,
                                y = d.y - q.data.y,
                                l = Math.hypot(x, y);
                            if (l < r) {
                                l = (l - r) / l * alpha;
                                d.x -= x *= l;
                                d.y -= y *= l;
                                q.data.x += x;
                                q.data.y += y;
                            }
                        }
                    } while (q = q.next);
                    return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                });
            }
        }
        force.initialize = _ => maxRadius = d3.max(nodes = _, d => d.r) + Math.max(padding1, padding2);
        return force;
    }
    function forceCluster() {
        const strength = 0.2;
        let nodes;

        function force(alpha) {
            const centroids = d3.rollup(nodes, centroid, d => d.data.group);
            const l = alpha * strength;
            for (const d of nodes) {
                const {x: cx, y: cy} = centroids.get(d.data.group);
                d.vx -= (d.x - cx) * l;
                d.vy -= (d.y - cy) * l;
            }
        }

        force.initialize = _ => nodes = _;

        return force;
    }

    nodes = pack(grpData).leaves();
    console.log({nodes})
    const simulation = d3.forceSimulation(nodes)
        .force("x", d3.forceX(WIDTH / 2).strength(0.01))
        .force("y", d3.forceY(HEIGHT / 2).strength(0.01))
        .force("cluster", forceCluster())
        .force("collide", forceCollide())
        .force("charge", d3.forceManyBody().strength(-0.4))
        .on("tick",tick)

    // const simulation = d3.forceSimulation()
    //     .nodes(nodes)
    //     .force("link", d3.forceLink(links).distance(100))
    //     .force('center', d3.forceCenter(WIDTH / 2, HEIGHT / 2))
    //     .force("x", d3.forceX())
    //     .force("y", d3.forceY())
    //     .force("charge", d3.forceManyBody().strength(-80))
    //     .alphaTarget(1)
    //     .on("tick", tick);

    // const nodes = pack().leaves();
    //nodes = simulation.nodes()
    //links = simulation.force("link").links()

    const dragger = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)

    const nodeEventHandler = (that) => {
        that.on("dblclick", doubleClicked)
            .on("contextmenu",rightClicked)
            .on("mouseover", mouseOver)
            .on("mouseout", mouseOut)
            .on("mousemove",mouseMove)
    };
    const netGroup = svg.append("g").attr("class","netgroup")
    // let link = netGroup.append("g").attr("class","edgegroup").selectAll(".qlink")
    let node = netGroup.append("g").attr("class","nodegroup").selectAll(".qnode")
    //let link = svg.append("g").attr("class","edgegroup").selectAll(".qlink")
    //let node = svg.append("g").attr("class","nodegroup").selectAll(".qnode")

    const zoom = d3.zoom().on("zoom", (event, d) => netGroup.attr("transform",event.transform));
    background.call(zoom);

    // create array of objects containing only track audio features
    const dataFeatures = nmData().map(d=> Object.fromEntries(
        Object.entries(d).filter(([key, value])=>threshMap.has(key))))
    // set defaults for threshMap as minimum value to propagate to slider values
    threshMap.forEach((value,key) => threshMap.set(key,d3.min(dataFeatures, d=>d[key])))

    function extractFeatures(d){
        const {acousticness,danceability,energy,instrumentalness,liveness,speechiness,valence, ..._} = d?.data??d//mData.get(d?.data?.source??d.source);
        return [acousticness, danceability, energy, instrumentalness, liveness, speechiness, valence]
    }

    function distance(d){
        //TODO: Once 100% sure of distance metric, "borrow" implementation from MLjs and remove library to reduce load
        const slideDist = ML.Distance.euclidean(extractFeatures(d),[...threshMap.values()])
        // console.log(slidedist)
        return slideDist
    }
    function circGrow(circ){
        return circ.transition()
            //.delay((d, i) => Math.random() * 500)
            //.duration(750)
            .attrTween("r", d => {
                const i = d3.interpolate(0, d.r);
                return t => d.r = i(t);
            })
    }

    function refresh(newEdgeData){
        //const curNodeMap = Object.fromEntries(nodes.map(n=> [n.name,n]))
        //const curLinkMap = Object.fromEntries(links.map(l=> [l.source.name+'_'+l.target.name,l]))
        //TODO: keep x,y,vx,vy for nodes existing in data already
        //nodes = {}
        // links = newEdgeData
        // // console.log({'nodesB4':nodes, 'linksB4':links})
        //
        // links.forEach(link => {
        //     link.source = nodes[link.source] || (nodes[link.source] = {name: link.source, group:link.group, weight: link.dist, track: mData.get(link.source)?.name ?? "Unknown"})
        //     link.target = nodes[link.target] || (nodes[link.target] = {name: link.target, group:link.group, weight: link.dist, track: mData.get(link.target)?.name ?? "Unknown"})
        // })
        newEdgeData.forEach(d=> d.dist = distance(d))
        grpData = ({children: Array.from(d3.group(newEdgeData, d=> d.group), ([, children])=>({children}))})
        nodes = pack(grpData).leaves();
        //link = link.data(links).join("line").attr("class", "link")
        // node = node.data(Object.values(nodes), d => d.name)
        let srcdata = Object.values(nodes)
        const rscale=d3.scalePow().domain(d3.extent(srcdata, d=>distance(d))).range([3,25]).exponent(2)
        node = node.data(srcdata[0].parent !== null ? srcdata : [], d => d.data.source)
            .join(enter => {
                    const grp = enter.append("g").attr("class", "node")
                    // grp.append("circle").attr("r", d => 3 + (d.weight*2)).style("fill", '#f03b20')
                    //Max radius is 3 + 14.094 (exp(euclidean(7x 0s, 7x 1s))
                    grp.append("circle")
                        .attr("r", d => rscale(distance(d)))//Math.exp(distance(d))))
                        .style("fill", d=>color(d.data.group))//'#f03b20')
                        .call(circGrow)
                    grp.append("text")
                        .attr("text-anchor","middle")
                        .attr("alignment-baseline","central")
                        .attr('x', d=> 0)//-rscale(distance(d)))//function() {return parseFloat(d3.select(this.previousElementSibling).attr('r'))+4})
                        .attr('y', d=> 0)
                        //.attr('dy',"50%")//-rscale(distance(d)))//mData.get(d.data.source).name
                        .classed("shadowed --hidden",true)
                        .style("z-index", 1)
                        .text(d=>  d.data.name.replace(/ ?-.+/,'').replace(/ ?\(.+ ?\)/,''))

                        //strip "- *" and "(*)" e.g. blah - remastered | blah (featuring foo and bar 1992)
                    return grp
                },
                update => update,
                exit => exit.remove())
            .call(dragger)
            .call(nodeEventHandler)


        //console.log({'nodesAft':nodes, 'linksAft':links})
        //console.log({'nodesAft':nodes})
        //simulation.stop()
        simulation.nodes(Object.values(nodes))
        simulation.force.initialize//(Object.values(nodes))
        //simulation.initialize(Object.values(nodes))
        //simulation.force("link").links(links)
        //simulation.alpha(1).restart()

    }

    refresh(nmData())


    const slider = d3.select("input#maxnode")
    slider.property("min",0).property("max", DATALEN).property("value",DATALEN)
    d3.select("output#maxnode-out").text(DATALEN)

    const fFormat = d3.format(".2f")
    const slideDiv = d3.select("div.sliders").selectAll(".vslider")
        .data(threshMap.entries()).enter()
        .append("div")

    slideDiv.append("output")
        .attr("for",d=>d[0])
        .attr("id", d=>d[0]+"-out")
        .text(d=> fFormat(d[1]))

    slideDiv.append("input")
        .attr("type","range")
        .attr("id",d=>d[0])
        .attr("name",d=>d[0])
        .attr("min",0)
        .attr("max",1.0)
        .attr("step",0.01)
        .attr("class","vslider")
        .property("value",d=>d[1])

    slideDiv.append("label")
        .attr("for",d=>d[0])
        .text(d=>d[0].charAt(0).toUpperCase()+d[0].slice(1,))


    function slideFilter(filterAttr, event, d) {
        //console.log({filterAttr, d})
        const nMax = parseFloat(slider.property("value"))
        d3.select("output#maxnode-out").text(nMax)
        const nVal = parseFloat(d3.select(event.target).property("value"))

        if (filterAttr !== "maxnode"){
            threshMap.set(filterAttr,nVal)
            d3.select(event.target.parentNode).select("output").text(fFormat(nVal))
        }

        //simulation.stop()
        let ndClone = nmData().slice(0,nMax)

        for (let [key, value] of threshMap) {
            ndClone = ndClone.filter(d => d[key] >= value)//mData.get(d.data.source)[key] >= value)// && mData.get(d.target)[filterAttr] >= value)
        }
        refresh(ndClone)
        simulation.alpha(1).restart()
        //console.log({nVal,nodes,links, threshMap})
    }

    slider.on("change", (event, d) => slideFilter("maxnode", event, d))
    slideDiv.selectAll("input").on("change", (event, d) => slideFilter(d[0], event, d))


    function tick() {
        // link.attr("x1", d => d.source.x)
        //     .attr("y1", d => d.source.y)
        //     .attr("x2", d => d.target.x)
        //     .attr("y2", d => d.target.y);
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        node.attr("transform", d => `translate(${d.x}, ${d.y})`)
    }


    // const tip = d3.select("body")
    //     .append("div")
    const tip = d3.select("div.control-panel")
        .insert("div", "div.search")
        .attr("id", "nodetip")
        //.style("position", "absolute")
        // .style("z-index", "5")
        .style("opacity",0)
        //.style("display","none")
        .style("pointer-events", "none")


    function radar(data, selector){
        const radarOpts = {
            w: 175,//200
            h: 175,//200
            //margin: ({top: 35, right: 75, bottom: 50, left: 75}),
            margin: ({top: 25, right: 40, bottom: 25, left: 60}),
            labelFactor: 1.2,
            wrapWidth: 120,
            maxValue: 1.0,
            levels: data.length,
            color: d3.scaleOrdinal().range(["#EDC951","#CC333F","#00A0B0"])
        }
        return RadarChart(selector,data,radarOpts)
    }

    function mouseOver(event, d){
        //if (d.fixed===true) {
            const nodeMetaData = d.data//mData.get(d.data.source)
            const {acousticness,danceability,energy,instrumentalness,liveness,speechiness,valence, ...metaObject} = nodeMetaData;
            const zoSubData = {acousticness,danceability,energy,instrumentalness,liveness,speechiness,valence};
            const radarData = Object.entries(zoSubData).map(([axis,value]) => ({axis,value}))
            //console.log(radarData)
            //console.log(metaObject)
            let baseHtml = "<ul class='bulletless'>"
            for (let [key, val] of Object.entries(metaObject).filter(([k,v])=>!["source","year","group"].includes(k))) {
                if (key==="artists")
                    val=val.slice(0,2)
                baseHtml += `<li><b>${key}</b>: ${val}</li>`
            }
            baseHtml+="</ul>"+"<div class='spiderchart'></div>"
            //console.log(baseHtml)
            tip.transition().duration(500).ease(d3.easeCubic)
                .style("opacity", 0.9)
                //.style("display", "inline-flex")
                //.style("z-index",5)
            tip.html(baseHtml)

            radar([radarData], ".spiderchart")
            //event.stopPropagation()
        //}
        d3.select(this).select("text").classed("--hidden",false)
    }
    function mouseOut(event, d){
        //explicitly state must be false, not undefined
        if (d.locked === false){
            tip.transition().duration(500).ease(d3.easeCubic)
                .style("opacity", 0)
                //.style("display","none")
                //.style("visibility", "hidden")
                // .style("z-index",-1)
        }
        if (d.fixed!==true) {
            d3.select(this).select("text").classed("--hidden", true)
        }
    }
    function mouseMove(event, d){
        if (d.fixed===true) {
            //tip.style('left', event.pageX + "px").style('top', event.pageY + "px")
        }
    }

    function rightClicked(event, d){
        event.preventDefault()
        //const rcname = mData.get(d.data.source)
        //this horrible looking statement means set d.locked = !d.locked if d has the attr "locked" else default to !true
        d.locked = !(d?.locked ?? true)
        //console.log({rcname,d,links})
        event.stopPropagation()
    }

    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
        d.fixed = true;
        d.locked = false;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        if (d.fixed === true) {
            d.fx = d.x;
            d.fy = d.y;
            d3.select(this).select("circle").classed("frozen", true);
        }
        else {
            d.fx = null;
            d.fy = null;
        }
    }

    function doubleClicked(event, d) {
        if (d.fixed === true) {
            if (!event.active) simulation.alphaTarget(0.25).restart();

            d.fx = null;
            d.fy = null;
            d.locked = false
            d.fixed = false
            d3.select(this).select("circle").classed("frozen", false);
        }
    }

}