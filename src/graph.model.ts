import CyclicalDependencyError from "./errors/cyclical-dependency.error";
import MissingDependencyError from "./errors/missing-dependency.error";
import { GraphEvents, GraphInterface, NestedNode, Node, NodeId, OneOrMore } from "./graph.interface";
import Mitt from 'mitt';

export default class Graph implements GraphInterface {
	public readonly emitter = Mitt<GraphEvents>();

	private readonly _nodes = new Map<NodeId, Node>();

	constructor() {}

	public addNode(...nodes: OneOrMore<Node>): this {
		// resolve the dependencies : sort the nodes
		const sortedNodes = this.sortNodes(nodes);

		// add them to the map
		sortedNodes.forEach(node => {
			this._nodes.set(node.id, node);
			this.emitter.emit('node:add', {node});
		});

		return this;
	}

	private sortNodes(nodes: Node[]): Node[] {
		return this.DFS(Array.from(this._nodes.values()), nodes);
	}

	private DFS(existing: Node[], newNodes: Node[]): Node[] {
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

		return sortedNodes.filter(node => !existing.includes(node));
	}

	public removeNode(...nodeIds: OneOrMore<NodeId>): this {
		return this._removeNodes('direct', ...nodeIds);
	}

	private _removeNodes(removalType: 'direct'|'prune', ...nodeIds: OneOrMore<NodeId>): this {
		nodeIds
		.map(nodeId => this._nodes.get(nodeId))
		.filter((node): node is Node => typeof node !== 'undefined')
		.forEach(node => {
			// remove dependents nodes first
			if (typeof node.deps !== 'undefined') {
				this._removeNodes('prune', ...node.deps);
			}
			this._nodes.delete(node.id);
			this.emitter.emit('node:remove', {node, removalType});
		})
		
		return this;
	}

	public replaceNode(...nodes: OneOrMore<NodeId>): this {
		throw new Error("Method not implemented.");
	}

	public get nodeList(): Map<string, Node> {
		return new Map(this._nodes);
	};
	
	public get nodes(): ReadonlyArray<NestedNode> {
		throw new Error("Method not implemented.");
	}
}
