import { printGraph } from "./graph.helpers";
import type { GraphInterface, NodeMap } from "./graph.interface";

// const graph = new Graph();
declare const graph: GraphInterface;

graph
	.addNode(
		{id: 'boris', deps: ['berte']},
		{id: 'berte', deps: []}
	)
	.addNode(
		{id: 'bob', deps: ['boris', 'berte']}
	)
	.replaceNode({id: 'berte', deps: ['bob']});


printGraph(graph); // berte -> boris -> bob

const node0 = graph.nodeList.get('boris');
const node1 = graph.nodes[0]?.children[0];

graph.removeNode('berte');

printGraph(graph); // []