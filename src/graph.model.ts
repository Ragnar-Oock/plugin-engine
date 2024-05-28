import { OneOrMore, hasOneOrMore } from "./array.helper";
import CyclicalDependencyError from "./errors/cyclical-dependency.error";
import MissingDependencyError from "./errors/missing-dependency.error";
import { GraphEvents, GraphInterface, NestedNode, Node, NodeId } from "./graph.interface";
import Mitt from 'mitt';

export default class Graph implements GraphInterface {
	public readonly emitter = Mitt<GraphEvents>();

	private readonly _nodes = new Map<NodeId, Node>();

	constructor() {}

	public addNode(...nodes: ReadonlyArray<Node>): this {
		if (hasOneOrMore(nodes)) {
			// resolve the dependencies : sort the nodes
			const sortedNodes = this.sortNodes(nodes);
			
			// add them to the map
			sortedNodes.forEach(node => {
				this._nodes.set(node.id, node);
				this.emitter.emit('node:add', {node});
			});
		}

		return this;
	}

	private sortNodes(nodes: OneOrMore<Node>): OneOrMore<Node> {
		return this.DFS(Array.from(this._nodes.values()), nodes);
	}

	private DFS(existing: Node[], newNodes: OneOrMore<Node>): OneOrMore<Node> {
		const sortedNodes: Node[] = [];
		const unmarked = [...existing, ...newNodes];
		const map = new Map(unmarked.map(node => [node.id, node] as const));
		const temporarlyMarked = new Set<Node>();
		const permanentlyMarked = new Set<Node>();

		const visit = (node: Node): void => {
			if (permanentlyMarked.has(node)) {
				return;
			}
			if (temporarlyMarked.has(node)) {
				throw new CyclicalDependencyError(node.id);
			}
			temporarlyMarked.add(node);
			node.deps?.forEach(dep => {
				const depNode = map.get(dep);
				if (typeof depNode !== 'undefined') {
					return visit(depNode);
				}
				throw new MissingDependencyError(node.id, node?.deps ?? [], this);
			});

			temporarlyMarked.delete(node);
			permanentlyMarked.add(node);
			sortedNodes.unshift(node);
		}

		let node = unmarked.pop();
		while (typeof node !== 'undefined') {
			visit(node);
			node = unmarked.pop();
		}

		return sortedNodes.filter(node => !existing.includes(node)) as unknown as OneOrMore<Node>;
	}

	public removeNode(...nodeIds: OneOrMore<NodeId>): this {
		// get all the nodes to be removed 
		const nodesToBeRemoved = Array
		.from(this._nodes.values())
		.filter(({id}) => nodeIds.includes(id));
		
		// get all the nodes depending on the nodes to be removed
		const dependentNodes = nodesToBeRemoved
		.flatMap(dependency => 
			Array
				.from(this._nodes.values())
				.filter(node => node.deps?.includes(dependency.id))
			)
		
		// remove all the above nodes
		dependentNodes.forEach(node => {
				this._nodes.delete(node.id);
				this.emitter.emit('node:remove', {node, removalType: 'prune'});
			});
		nodesToBeRemoved.forEach(node => {
			this._nodes.delete(node.id);
			this.emitter.emit('node:remove', {node, removalType: 'direct'});
		});		
		
		return this;
	}

	public replaceNode(...nodes: OneOrMore<Node>): this {
		throw new Error("Method not implemented.");
	}

	public get nodeList(): Map<string, Node> {
		return new Map(this._nodes);
	};
	
	public get nodes(): ReadonlyArray<NestedNode> {
		throw new Error("Method not implemented.");
	}
}
