import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export default function GraphView({ data }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || !data.nodes || !data.edges) return;

    const width = 700;
    const height = 500;

    // Clone so d3 can mutate x/y/vx/vy without touching React state directly
    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.edges.map(e => ({ ...e }));

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear any previous render

    const g = svg.append('g');

    // --- Zoom + pan ---
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // --- Force simulation ---
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(140))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(50));

    const link = g.append('g')
      .attr('stroke', '#94a3b8')
      .attr('stroke-width', 1.5)
      .selectAll('line')
      .data(links)
      .join('line');

    const linkLabel = g.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .text(d => d.label || '')
      .attr('font-size', 10)
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle');

    // --- Draggable nodes ---
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'grab')
      .call(
        d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            // Node stays pinned where you drop it.
            // To let it spring back into the simulation instead, uncomment:
            // d.fx = null;
            // d.fy = null;
          })
      );

    node.append('circle')
      .attr('r', 34)
      .attr('fill', '#2563eb');

    node.append('foreignObject')
      .attr('x', -40)
      .attr('y', -34)
      .attr('width', 80)
      .attr('height', 68)
      .append('xhtml:div')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('text-align', 'center')
      .style('color', 'white')
      .style('font-size', '10px')
      .style('font-weight', '500')
      .style('padding', '0 4px')
      .style('line-height', '1.2')
      .text(d => d.label);

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      linkLabel
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data]);

  return (
    <svg ref={svgRef} viewBox="0 0 700 500" className="w-full h-full" style={{ cursor: 'grab' }} />
  );
}