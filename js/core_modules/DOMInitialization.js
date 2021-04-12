
//event handlers
const trackTip = d3.select("div.tip-container")
    .append("div")
    //.insert("div", "div.search")
    .attr("id", "nodetip")
    .attr("class","spiderchart")
    .style("opacity",0)
    //.style("pointer-events", "none")

const trackInfo = d3.select('div.track-info')
    .append("ul")
    .classed("bulletless", true)

const trackSample = d3.select('div.track-info')
    .append("div")
    .classed("track-sample",true)
    .style("display","block")
    .style("opacity",0)


const mergeTip = d3.select("div#container")
    .append("div")
    .attr("id", "merge-tip")
    .classed("radar-dark",true)
    .style("position", "absolute")
    .style("z-index", 1)
    .style("opacity",0)
    .style("height","0px")
    //.style("pointer-events", "none")
    .style('right',"10px").style('top',0)

mergeTip.append("div")
    .classed("close-wrapper",true)
    .on("click", ()=>mergeTip.transition().duration(200).style("opacity",0).style("height", "0px").style("display","none"))//.style("opacity",0))
    .append("i").classed("far fa-times",true)

mergeTip.append("div").classed("spiderchart",true)

const mergeTable = mergeTip.append("div")
    .classed("merge-table",true)
    .append("table")
    .classed("table table-dark table-hover table-sm m-table",true)

mergeTable.append('thead').append('tr')
    .append('th').attr('scope','col').attr('colspan',2)
    .text("Average Values")

const mergeTableBody = mergeTable.append("tbody")
const bPanel = mergeTip.append("div").classed("button-panel",true)


//Main demo
function getSvg(selector, width, height){
    const svg = d3.select(selector)
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet") // This Does NOT break zoom, fine to leave
        .attr("viewBox", [0, 0, width, height])
        //.style("background","#F6F6F6")
        // .style("margin", Object.values(margin).join(" "))
        .classed("svg-content", true);
    return svg
}
function addBackgroud(svg, width, height){
    //https://bl.ocks.org/christianbriggs/c6f283457fc9abb2b88b3393e73d90f0
    const background = svg
        .append("rect")
        .attr("id", "bg")
        .attr("fill", "#fafbfc")
        .attr("class", "view")
        .attr("x", 0.5)
        .attr("y", 0.5)
        .attr("width", width - 1)
        .attr("height", height - 1)
    return background
}

function initializeSliders(sliderValueMap, DATALEN, nInitNodes=1000){
    const slider = d3.select("input#maxnode")
    slider.property("min",0).property("max", DATALEN).property("value",nInitNodes)
    d3.select("output#maxnode-out").text(nInitNodes)

    const descriptions = [
        //Max Nodes -> Maximum Nodes Displayed
        "Acousticness: presence of acoustics",
        "Danceability: suitability for dancing",
        "Energy: intensity and activity",
        "Instrumentalness: prediction of vocal content",
        "Speechiness: presence of spoken words",
        "Liveness: presence of live audience",
        "Valence: musical positivity",
        ]

    const slideDiv = d3.select(".sliders ul").selectAll(".vxslider")
        .data(sliderValueMap.entries()).enter()
        .append("li")
        .classed("slider-group",true)

    slideDiv.append("label")
        .attr("for",d=>d[0])
        .text(d=>d[0].charAt(0).toUpperCase()+d[0].slice(1,))
        .append("span")
        .classed("fal fa-info-circle info-ico",true)
        .attr("data-toggle","tooltip")
        .attr("data-placement","top")
        .attr("title",(d,i)=>descriptions[i])
        //.append("i").classed("fal fa-info-circle",true)


    slideDiv.append("input")
        .attr("type","range")
        .attr("id",d=>d[0])
        .attr("name",d=>d[0])
        .attr("min",0)
        .attr("max",1.0)
        .attr("step",0.01)
        .property("value",d=>d[1])

    slideDiv.append("output")
        .attr("for",d=>d[0])
        .attr("id", d=>d[0]+"-out")
        .text(d=> d3.format(".2f")(d[1]))

    $('[data-toggle="tooltip"]').tooltip()
    return [slider, slideDiv]
}

export {trackTip, trackInfo, trackSample, mergeTip, mergeTable, mergeTableBody, bPanel, addBackgroud, getSvg, initializeSliders}