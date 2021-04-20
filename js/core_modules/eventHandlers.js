// const tip = d3.select("div.control-panel")
import {trackTip,trackInfo, trackSample} from "./DOMInitialization.js";


function radar(data, selector){
    const radarOpts = {
        w: 200,//200
        h: 200,//200
        //margin: ({top: 35, right: 75, bottom: 50, left: 75}),
        margin: ({top: 35, right: 40, bottom: 25, left: 50}),
        // margin: ({top: 25, right: 25, bottom: 25, left: 25}),
        dotRadius: 3, 			//The size of the colored circles of each blog
        strokeWidth: 1,
        labelFactor: 1.2,
        wrapWidth: 120,
        maxValue: 1.0,
        levels: data.length,
        color: d3.scaleOrdinal().range(["#EDC951","#CC333F","#00A0B0","#06b000","#a003f5"])//["#EDC951","#a003f5","#06b000","#CC333F","#00A0B0","#a003f5"])
    }
    return RadarChart(selector,data,radarOpts)
}

const dragger = (simulation) => {
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.1).restart();
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
            d3.select("#track-merge >span").text(d3.selectAll('.frozen').data().length)

        }
        else {
            d.fx = null;
            d.fy = null;
        }
    }
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
};
function populateTrackDisplays(nodeData){
    const {acousticness,danceability,energy,instrumentalness,liveness,speechiness,valence, ...metaObject} = nodeData;
    const zoSubData = {acousticness,danceability,energy,instrumentalness,speechiness,liveness,valence};
    const radarData = Object.entries(zoSubData).map(([axis,value]) => ({axis,value}))

    let baseHtml = ""
    //const removedFeatures = ["source","year","id"]// "group"
    const displayOrder = ["name","artists","release_date","explicit","popularity", "duration_ms",
        "tempo", "loudness", "key", "mode", "group", "similarity"]
    //for (let [key, val] of Object.entries(metaObject).filter(([k,v])=>!removedFeatures.includes(k))) {
    for (let key of displayOrder) {
        let val = metaObject[key]
        if (key==="artists"){
            val=val.slice(0,2)
        }
        baseHtml += `<li><b>${key}</b>: ${val}</li>`
    }

    trackInfo.html(baseHtml)
    const baseUrl = "https://p.scdn.co/mp3-preview/"
    const trackUrl = nodeData['preview_url'] !== "NA" ? baseUrl+nodeData['preview_url'] : false

    if (trackUrl){
        trackSample.style("opacity",0.9)
            .selectAll("audio")
            .data([trackUrl])
            .join("audio").attr("src",d=>d).property("controls",true)

    }
    else {
        trackSample.style("opacity",0)
    }

    trackTip.transition().duration(500).ease(d3.easeCubic).style("opacity", 0.9)

    radar([radarData], ".spiderchart")
}

function nodeEventHandler (node, simulation) {
    function mouseOver(event, d) {
        //if (d.fixed===true) {
        d3.select(this).select("text").classed("--hidden",false)
        const nodeMetaData = d.data
        populateTrackDisplays(nodeMetaData)
        // const {acousticness,danceability,energy,instrumentalness,liveness,speechiness,valence, ...metaObject} = nodeMetaData;
        // const zoSubData = {acousticness,danceability,energy,instrumentalness,speechiness,liveness,valence};
        // const radarData = Object.entries(zoSubData).map(([axis,value]) => ({axis,value}))
        //
        // let baseHtml = ""
        // //const removedFeatures = ["source","year","id"]// "group"
        // const displayOrder = ["name","artists","release_date","explicit","popularity", "duration_ms",
        //     "tempo", "loudness", "key", "mode", "group", "similarity"]
        // //for (let [key, val] of Object.entries(metaObject).filter(([k,v])=>!removedFeatures.includes(k))) {
        // for (let key of displayOrder) {
        //     let val = metaObject[key]
        //     if (key==="artists"){
        //         val=val.slice(0,2)
        //     }
        //     baseHtml += `<li><b>${key}</b>: ${val}</li>`
        // }
        //
        // trackInfo.html(baseHtml)
        // const baseUrl = "https://p.scdn.co/mp3-preview/"
        // const trackUrl = nodeMetaData['preview_url'] !== "NA" ? baseUrl+nodeMetaData['preview_url'] : false
        //
        // if (trackUrl){
        //     trackSample.style("opacity",0.9)
        //         .selectAll("audio")
        //         .data([trackUrl])
        //         .join("audio").attr("src",d=>d).property("controls",true)
        //
        // }
        // else {
        //     trackSample.style("opacity",0)
        // }
        //
        //
        // trackTip.transition().duration(500).ease(d3.easeCubic).style("opacity", 0.9)
        //
        //
        // radar([radarData], ".spiderchart")

    }

    function mouseOut(event, d) {
        //explicitly state must be false, not undefined
        //if (d.locked === false)
        //    tip.transition().duration(500).ease(d3.easeCubic).style("opacity", 0)

        if (d.fixed !== true)
            d3.select(this).select("text").classed("--hidden", true)

    }

    function nodeClick(event, d){
        const sbmenu = $(".sidebar-submenu.track-info")
        const parent = sbmenu.parent()
        if (parent.hasClass("active")) {
            if (d.fixed === false){
                sbmenu.slideUp(200);
                parent.removeClass("active");
            }

        } else {
            sbmenu.slideDown(200);
            parent.addClass("active");
        }

    }

    //function mouseMove(event, d){null}
        //if (d.fixed===true) {
        //tip.style('left', event.pageX + "px").style('top', event.pageY + "px")
        //}


    function rightClicked(event, d) {
        //nodeClick()
        event.preventDefault()
        //const rcname = mData.get(d.data.source)
        //this horrible looking statement means set d.locked = !d.locked if d has the attr "locked" else default to !true
        d.locked = !(d?.locked ?? true)
        // if (d.fixed === true){
        //     d3.selectAll(".frozen")
        //     const {acousticness,danceability,energy,instrumentalness,liveness,speechiness,valence, ...metaObject} = d.data;
        //     const zoSubData = {acousticness,danceability,energy,instrumentalness,speechiness,liveness,valence};
        //     const radarData = Object.entries(zoSubData).map(([axis,value]) => ({axis,value}))
        //     radar([radarData], ".spiderchart")
        // }
        //console.log({rcname,d,links})
        event.stopPropagation()
    }

    function doubleClicked(event, d) {
        if (d.fixed === true) {
            if (!event.active) simulation.alpha(0.05).restart();

            d.fx = null;
            d.fy = null;
            d.locked = false
            d.fixed = false
            d3.select(this).select("circle").classed("frozen", false);
        }
    }

    return node
        .on("dblclick", doubleClicked)
        .on("click", nodeClick)
        .on("contextmenu",rightClicked)
        .on("mouseover", mouseOver)
        .on("mouseout", mouseOut)
        .on("mousemove",null)
}

export {nodeEventHandler, dragger, radar, populateTrackDisplays};