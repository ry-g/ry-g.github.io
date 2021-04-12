//https://observablehq.com/@d3/clustered-bubbles?collection=@d3/d3-force

/**
 * @param {number} alpha - rigidity of node groups
 * @param {number} intraGroupPadding - separation between nodes within a group
 * @param {number} interGroupPadding - separation between nodes of different groups
 */
function forceCollide(alpha = 0.6, intraGroupPadding = 15, interGroupPadding= 45) {
    let nodes;
    let maxRadius;

    function force() {
        const quadtree = d3.quadtree(nodes, d => d.x, d => d.y);
        //console.log({quadtree})
        for (const d of nodes) {
            const r = d.r + maxRadius;
            const
                nx1 = d.x - r, ny1 = d.y - r,
                nx2 = d.x + r, ny2 = d.y + r;
            quadtree.visit((q, x1, y1, x2, y2) => {
                if (!q.length) do {
                    if (q.data !== d) {
                        const r = d.r + q.data.r + (d.data.group === q.data.data.group ? intraGroupPadding : interGroupPadding);
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
    force.initialize = _ => maxRadius = d3.max(nodes = _, d => d.r) + Math.max(intraGroupPadding, interGroupPadding);
    return force;
}

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

function forceCluster(strength = 0.2) {
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

function circGrow(circ){
    return circ.transition()
        .delay((d, i) => Math.random() * 500)
        .duration(750)
        .attrTween("r", d => {
            const i = d3.interpolate(0, d.r);
            return t => d.r = i(t);
        })
}

export { centroid, forceCluster, forceCollide, circGrow };