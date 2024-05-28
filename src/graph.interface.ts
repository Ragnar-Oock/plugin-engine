import { Emitter } from 'mitt';
import { OneOrMore } from './array.helper';

export type NodeId = string;

export interface Node<id extends NodeId = NodeId> {
	readonly id: id;
	readonly deps?: OneOrMore<NodeId>;
	[x: string]: any; // figure out a way allow that but without this line
}

/**
 * Image of a {@link Node} in a graph
 */
export interface NestedNode extends Node {
	// readonly isRoot: boolean // kinda useless... maybe make helper function instead
	/**
	 * Lists and map the images of the nodes that declare the imaged node as their dependency.
	 */
	children: ReadonlyMap<NodeId, NestedNode>;
	/**
	 * Lists and map the images of the nodes the imaged node declares as its dependencies.
	 * If empty the object is considered a root node.
	 */
	parents: ReadonlyMap<NodeId, NestedNode>;
}

export type GraphEvents = {
	'node:add': {node: Node},
	'node:remove': {node: Node, removalType: 'direct'|'prune'},
	'node:replace': {oldNode: Node, newNode: Node},
}

/**
 * A simple Directed Acyclic Graph representation and manipulation thingy.
 */
export interface GraphInterface {
	readonly emitter: Emitter<GraphEvents>;

	/**
	 * Add a {@link Node node} to the graph.
	 * 
	 * @transactional if the dependency resolution fails the graph is not modified.
	 * 
	 * @param node The node to add in the graph
	 * 
	 * @throws {MissingDependencyError} The node declares a dependency that is not yet in the graph.
	 * 
	 * @todo check if this can result in a cycle or not (I don't think it would tho)
	 * @todo decide if adding an existing node does nothing, replace the node or throws an error
	 * 
	 * @fires 'node:add' a node has been haded to the graph
	 */
	addNode(node: Node): this;
	
	/**
	 * Add one or more {@link Node node} to the graph, resolving the dependencies as needed.
	 * If multiple interdependent nodes are added at once they will be added in the order of their dependency,
	 * the nodes with no dependencies (or depencies to node already in the graph) first and the others next.
	 * 
	 * @transactional if the dependency resolution fails the graph is not modified.
	 * 
	 * @param node a list of nodes to add to the graph
	 * 
	 * @throws {MissingDependencyError} a node declares dependencies that are not part of the graph and not in the provided list of nodes
	 * @throws {CyclicalDependencyError} a node declares a dependencies that directly or indirectly resolve to itself. 
	 * 
	 * @todo decide if adding existing nodes does nothing, replace the nodes or throws an error
	 * 
	 * @fires 'node:add' a node has been added to the graph
	 */
	addNode(...node: ReadonlyArray<Node>): this;
	
	/**
	 * Remove one or more nodes from the graph, pruning the node that depends on them in the process.
	 * 
	 * @idempotent
	 * 
	 * @param nodeId the id of the node(s) to remove from the graph
	 * 
	 * @fires 'node:remove' a node has been removed from the graph
	 */
	removeNode(...nodeId: OneOrMore<NodeId>): this;

	/**
	 * Replace one or more nodes by new ones based on their id, resolving the dependencies as needed.
	 * 
	 * @transactional if the dependency resolution fails the graph is not modified (existing nodes are not removed and no new node is added)
	 * 
	 * @todo decide if nodes with no existing counterpart in the graph should be added in place or result in an error
	 * 
	 * @param node one or more nodes to replace the existing ones
	 * 
	 * @throws {MissingDependencyError} a replacement node declares dependencies that are not part of the graph and not in the provided list of nodes
	 * @throws {CyclicalDependencyError} a replacement node declares dependencies that directly or indirectly point to itself.
	 * 
	 * @fires 'node:remove' a node has been removed from the graph
	 * @fires 'node:add' a node has been added to the graph
	 * @fires 'node:remplace' a node has been remaplaced
	 */
	replaceNode(...node: OneOrMore<Node>): this;

	/**
	 * A flattened representation of the graph
	 */
	readonly nodeList: ReadonlyMap<NodeId, Node>;
	/**
	 * A "tree view" of the graph.
	 * Items in the returned ReadonlyMap are the nodes that don't declare any dependencies,
	 * they expose a `children` map holding the nodes that declare them as a dependencies.
	 * Non-root 
	 */
	readonly nodes: ReadonlyMap<NodeId, NestedNode>;
}