import { beforeEach, describe, expect, it, vi } from "vitest";

import Graph from '../src/graph.model';
import MissingDependencyError from '../src/errors/missing-dependency.error';
import CyclicalDependencyError from '../src/errors/cyclical-dependency.error';
import { GraphEvents, Node, NodeId } from "../src/graph.interface";
import { OneOrMore } from "../src/array.helper";

describe('graph', () => {
	describe('addNode (single)', () => {
		it('should add a node without dependencies to the graph', () => {
			const graph = new Graph();

			graph.addNode({id: 'bob'});

			expect(graph.nodeList.get('bob')?.id).toBe('bob');
		});
		it('should add a node with valid dependencies to the graph', () => {
			const graph = new Graph();

			graph.addNode({id: 'bob'});
			graph.addNode({id: 'boris', deps: ['bob']});

			expect(graph.nodeList.get('bob')?.id).toBe('bob');
			expect(graph.nodeList.get('boris')?.id).toBe('boris');
		});
		it('should fail to add a node with missing dependencies', () => {
			 const graph = new Graph();

			 expect(() => {
				graph.addNode({id: 'boris', deps: ['bob']});
			 }).toThrowError(MissingDependencyError);
		});
		it('should fire a "node:add" event on sucess', () => {
			const graph = new Graph();

			const node = {id: 'bob'};
			const spy = vi.fn();
			graph.emitter.on('node:add', spy);

			graph.addNode(node);

			expect(spy).toHaveBeenCalledWith({node});
		});
		it('should not change the graph on a failure', () => {
			const graph = new Graph();
			
			const node = {id: 'bob'};
			graph.addNode(node);
			
			try {
				graph.addNode({id: 'boris', deps: ['bobinette']});
			}
			catch (error) {
				// no op
			}
			
			expect(graph.nodeList.get('bob')).toBe(node);
			
			// this one is a dousy
		});
		it('should return the graph instance', () => {
			const graph = new Graph();
			
			expect(graph.addNode({id: 'bob'})).toBe(graph);
		});
		it('should add a node with publicate declarations of the same dependency');
	});

	describe('addNode (multiple)', () => {
		it('should add multiple nodes without dependencies to the graph or themselves', () => {
			const graph = new Graph();

			graph.addNode(
				{id: 'bob'},
				{id: 'bobinete'},
			);

			expect(graph.nodeList.get('bob')?.id).toBe('bob');
			expect(graph.nodeList.get('bobinete')?.id).toBe('bobinete');
		});
		it('should add multiple nodes with dependencies to the graph but not themselves', () => {
			const graph = new Graph();

			graph.addNode({ id: 'bob' });

			graph.addNode(
				{ id: 'boris', deps: ['bob'] },
				{ id: 'bobinete', deps: ['bob'] },
			);

			expect(graph.nodeList.get('bob')?.id).toBe('bob');
			expect(graph.nodeList.get('boris')?.id).toBe('boris');
			expect(graph.nodeList.get('bobinete')?.id).toBe('bobinete');
		});
		it('should add multiple nodes without dependencies to the graph but to themselves', () => {
			const graph = new Graph();

			graph.addNode({id: 'bob'});

			graph.addNode(
				{ id: 'boris', deps: ['bobinete'] },
				{ id: 'bobinete' },
			);

			expect(graph.nodeList.get('bob')?.id).toBe('bob');
			expect(graph.nodeList.get('boris')?.id).toBe('boris');
			expect(graph.nodeList.get('bobinete')?.id).toBe('bobinete');
		});
		it('should fail to add multiple nodes with a cyclical dependency within themselves', () => {
			const graph = new Graph();

			expect(() => {
				graph.addNode(
					{ id: 'boris', deps: ['bobinete'] },
					{ id: 'bobinete', deps: ['boris'] },
				);
			}).toThrowError(CyclicalDependencyError);
		});
		it('should fail to add multiple nodes with a missing dependency', () => {
			const graph = new Graph();
			
			expect(() => {
				graph.addNode(
					{ id: 'boris', deps: ['bobinete'] },
					{ id: 'bobinete', deps: ['bob'] },
				);
			}).toThrowError(MissingDependencyError);
		});
		it('should return the graph instance', () => {
			const graph = new Graph();
			
			expect(graph.addNode({id: 'bob'})).toBe(graph);
		});
	});

	describe('removeNode (single)', () => {
		it('should remove a node with no dependents', () => {
			const graph = new Graph();

			graph.addNode({id: 'bob'});

			graph.removeNode('bob');
			expect(graph.nodeList.size).toBe(0);
		});
		it('should remove multiple non dependent nodes', () => {
			const graph = new Graph();

			const ids = ['bob', 'boris'];

			graph
				.addNode(
					...ids.map(id => ({id}))
				)
				.removeNode('bob', 'boris');

			expect(graph.nodeList).toHaveLength(0);
		});
		it('should prune dependent nodes', () => {
			const graph = new Graph();

			graph.addNode(
				{id: 'bob'},
				{id: 'boris', deps: ['bob']}
			);

			graph.removeNode('bob');
			
			expect(graph.nodeList.size).toBe(0);
		});
		it('should emit a "node:remove" event (direct)', () => {
			const graph = new Graph();
			const node = {id: 'bob'};

			graph.addNode(node);
			const spy = vi.fn();
			graph.emitter.on('node:remove', spy);
			graph.removeNode(node.id);

			expect(spy).toHaveBeenLastCalledWith({node, removalType: "direct"});
		});
		it('should emit a "node:remove" event (prune)', () => {
			const graph = new Graph();

			const bob = {id: 'bob'};
			const boris = {id: 'boris', deps: ['bob']} as const;
			graph.addNode(bob, boris);

			const spy = vi.fn();
			graph.emitter.on('node:remove', spy);
			graph.removeNode(bob.id);

			expect(spy).toHaveBeenCalledWith({node: boris, removalType: 'prune'});
			expect(spy).toHaveBeenCalledWith({node: bob, removalType: 'direct'});
		});
		it('should not fail to remove an inexistant node', () => {
			const graph = new Graph();

			graph.removeNode('bob');

			expect(true).toBe(true); // if this passes the above code didn't throw any error
		})
		it('should return the graph instance', () => {
			const graph = new Graph();
			
			expect(graph.addNode({id: 'bob'})).toBe(graph);
		});
	})

	describe('replaceNode (single)', () => {
		let graph: Graph;
		beforeEach(() => {
			graph = new Graph();
		})
		it('should replace a node by another one with same id (no deps => no deps)', () => {
			const id = 'bob'
			graph
				.addNode({id, mark: 'original'})
				.replaceNode({id, mark: 'new'});

			expect(graph.nodeList.get(id)).toHaveProperty('mark', 'new');
		});
		it('should replace a node by another one with same id (deps => no deps)', () => {
			const id = 'bob'
			graph
				.addNode(
					{id, deps: ['boris'], mark: 'original'},
					{id: 'boris'}
				)
				.replaceNode({id, mark: 'new'});

			expect(graph.nodeList.get(id)).toHaveProperty('mark', 'new');
		});
		it('should replace a node by another one with same id (no deps => deps)', () => {
			const id = 'bob'
			graph
				.addNode(
					{id, mark: 'original'},
					{id: 'boris'}
				)
				.replaceNode({id, deps: ['boris'], mark: 'new'});

			expect(graph.nodeList.get(id)).toHaveProperty('mark', 'new');
		});
		it('should replace a node by another one with same id (deps => same deps)', () => {
			const id = 'bob'
			graph
				.addNode(
					{id, deps: ['boris'], mark: 'original'},
					{id: 'boris'}
				)
				.replaceNode({id, deps: ['boris'], mark: 'new'});

			expect(graph.nodeList.get(id)).toHaveProperty('mark', 'new');
		});
		it('should replace a node by another one with same id (deps => other deps)', () => {
			const id = 'bob'
			graph
				.addNode(
					{id, deps: ['boris'], mark: 'original'},
					{id: 'boris'},
					{id: 'berte'}
				)
				.replaceNode({id, deps: ['berte'], mark: 'new'});

			expect(graph.nodeList.get(id)).toHaveProperty('mark', 'new');
		});
		it('should throw a MissingDependencyError if a replacement is missing its dependencies', () => {
			const id = 'bob'
			graph
				.addNode(
					{id}
				);
			

			expect(() => graph.replaceNode({id, deps: ['berte']})).toThrowError(MissingDependencyError)
		});
		it('should throw a CyclicalDependencyError of a replacement node declare an indirect dependency to itself', () => {
			const id = 'bob'
			graph
				.addNode(
					{id},
					{id: 'boris', deps: [id]}
				);
			

			expect(() => graph.replaceNode({id, deps: ['boris']})).toThrowError(CyclicalDependencyError)
		});
		it('should throw a CyclicalDependencyError of a replacement node declare a direct dependency to itself', () => {
			const id = 'bob'
			graph
				.addNode(
					{id},
					{id: 'boris', deps: [id]}
				);
			

			expect(() => graph.replaceNode({id, deps: [id]})).toThrowError(CyclicalDependencyError)
		});
		it('should emit a "node:remove" event for the replaced node', () => {
			const id = 'bob';
			const node = {id};
			const newNode = {id, mark: 'replacement'};

			type eventType = GraphEvents['node:remove'][]

			graph.addNode(node);

			const spy = vi.fn<eventType>();
			graph.emitter.on('node:remove', spy);
			graph.replaceNode(newNode);
			
			expect(spy).toHaveBeenCalledWith<eventType>({node, removalType: 'direct'});
		});
		it('should emit a "node:add" event for the replacement node', () => {
			const id = 'bob';
			const node = {id};
			const newNode = {id, mark: 'replacement'};

			type eventType = GraphEvents['node:add'][]

			graph.addNode(node);

			const spy = vi.fn<eventType>();
			graph.emitter.on('node:add', spy);
			graph.replaceNode(newNode);
			
			expect(spy).toHaveBeenCalledWith<eventType>({node});
		});
		it('should emit a "node:replace" event for the replaced node', () => {
			const id = 'bob';
			const node = {id};
			const newNode = {id, mark: 'replacement'};

			type eventType = GraphEvents['node:replace'][]

			graph.addNode(node);

			const spy = vi.fn<eventType>();
			graph.emitter.on('node:replace', spy);
			graph.replaceNode(newNode);
			
			expect(spy).toHaveBeenCalledWith<eventType>({oldNode: node, newNode});
		});
		it('should emit the events in order (remove, add and replace)', () => {
			const id = 'bob';
			const node = {id};
			const newNode = {id, mark: 'replacement'};
			
			graph.addNode(node);

			const events = [
				'node:add',
				'node:remove',
				'node:replace'
			] as const satisfies ReadonlyArray<keyof GraphEvents>;

			const spies = events
				.map(event => {
					const spy = vi.fn<GraphEvents[typeof event][]>();
					graph.emitter.on(event, spy)
					return spy;
				})
			
			graph.replaceNode(newNode);
			
			spies
				.forEach((spy, index) => {
					expect(spy).toHaveBeenNthCalledWith(index + 1, expect.any(Object));
				});
		});
		it('should not modify the graph on error (MissingDependencyError)', () => {
			const id = 'bob'

			graph.addNode({id});
			
			const nodeSnapshot = structuredClone(graph.nodes);

			expect(() => graph.replaceNode({id, deps: ['berte']})).toThrowError(MissingDependencyError);
			expect(graph.nodes).toEqual(nodeSnapshot);
		});
		it('should not modify the graph on error (CyclicalDependencyError)', () => {
			const id = 'bob'

			graph.addNode(
				{id},
				{id: 'boris', deps:[id]}
			);
			
			const nodeSnapshot = structuredClone(graph.nodes);

			expect(() => graph.replaceNode({id, deps: ['boris']})).toThrowError(CyclicalDependencyError);
			expect(graph.nodes).toEqual(nodeSnapshot);
		});
	});

	describe('replaceNode (multiple)', () => {
		let graph: Graph;
		beforeEach(() => {
			graph = new Graph();
		})

		
		/**
		 * check if an array of Nodes includes a node that matches the id of the provided node
		 * @param array an array of nodes to look throught
		 * @param node a node to find a match for
		 */
		function includesNode(array: OneOrMore<Node>, node: Node): boolean {
			return array.findIndex(({id}) => node.id === id) !== -1;
		}

		/**
		 * Generate a callback to check if a set of nodes have been replaced.
		 * Expects replacements to have a `mark: 'replacement'` and original values to have `mark: 'original'`.
		 * @param replacements the nodes to check if they got replaced or not
		 */
		function expectNodeReplacement(replacements: OneOrMore<Node>): (node: Node) => void {
			return node => {
				expect(node)
					.toHaveProperty('mark', includesNode(replacements, node) ? 'replacement' : 'original');
			};
		}

		it('should replace multiple nodes by others with the same id (no deps => no deps)', () => {

			const replacements = [
				{id: 'bob', mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)
				.replaceNode(...replacements);

			graph
				.nodeList
				.forEach(expectNodeReplacement(replacements));
			expect(graph.nodeList).toHaveLength(3);
		});
		it('should replace multiple nodes by others with the same id (deps => no deps)', () => {
			
			const replacements = [
				{id: 'bob', mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)
				.replaceNode(...replacements);

			graph
				.nodeList
				.forEach(expectNodeReplacement(replacements));
			expect(graph.nodeList).toHaveLength(3);
		});
		// this one will be hard...
		it('should replace multiple nodes by others with the same id (no deps => deps)', () => {
			const replacements = [
				{id: 'bob', deps: ['boris'], mark: 'replacement'},
				{id: 'id', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', mark: 'original'},
					{id: 'boris', mark: 'original'}
				)
				.replaceNode(...replacements);

			graph
				.nodeList
				.forEach(expectNodeReplacement(replacements));
			expect(graph.nodeList).toHaveLength(2);
		});
		it('should replace multiple nodes by others with the same id (deps => same deps)', () => {
			const replacements = [
				{id: 'bob', deps: ['boris'], mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'}
				)
				.replaceNode(...replacements);

			graph
				.nodeList
				.forEach(expectNodeReplacement(replacements));
			expect(graph.nodeList).toHaveLength(2);
		});
		it('should replace multiple nodes by others with the same id (deps => other deps)', () => {
			
			const replacements = [
				{id: 'bob', deps: ['boris'], mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			graph
				.addNode(
					{id: 'bob', deps: ['berte'], mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)
				.replaceNode(...replacements);

			graph
				.nodeList
				.forEach(node => expect(node).toHaveProperty('mark', 'replacement'));
			expect(graph.nodeList).toHaveLength(2);
		});
		it('should throw a MissingDependencyError and not modify the graph if a replacement is missing its dependencies', () => {
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'}
				);
			const nodeSnapshot = structuredClone(graph.nodeList);
			expect(() => graph.replaceNode({id: 'bob', deps: ['berte'], mark: 'replacement'})).toThrowError(MissingDependencyError);			
			expect(graph.nodeList).toEqual(nodeSnapshot);
		});
		it('should throw a CyclicalDependencyError and not modify the graph if a replacement node declare an indirect dependencies to itself', () => {
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'}
				);
			const nodeSnapshot = structuredClone(graph.nodeList);

			expect(() => graph.replaceNode({id: 'boris', deps: ['bob']})).toThrowError(CyclicalDependencyError);
			expect(graph.nodeList).toEqual(nodeSnapshot);
		});
		it('should throw a CyclicalDependencyError and not modify the graph if a replacement node declare a direct dependencies to itself', () => {
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'}
				);
			const nodeSnapshot = structuredClone(graph.nodeList);	
			
			expect(() => graph.replaceNode({id: 'boris', deps: ['boris']})).toThrowError(CyclicalDependencyError);
			expect(graph.nodeList).toEqual(nodeSnapshot);
		});
		it('should emit a "node:remove" event for all nodes that are replaced', () => {
			const replacements = [
				{id: 'bob', mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)
			
			const spy = vi.fn();
			replacements.forEach(node => {
				graph.emitter.on('node:remove', spy);
			});
			
			replacements.forEach(node => {
				expect(spy).toHaveBeenCalledWith<GraphEvents['node:remove'][]>({node, removalType: 'direct'});
			})
		});
		it('should emit a "node:add" event for the replacement nodes', () => {
			const replacements = [
				{id: 'bob', mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)
			
			const spy = vi.fn();
			replacements.forEach(node => {
				graph.emitter.on('node:add', spy);
			});
			
			replacements.forEach(node => {
				expect(spy).toHaveBeenCalledWith<GraphEvents['node:add'][]>({node})
			})
		});
		it('should emit a "node:replace" event for every replacement', () => {
			const replacements = [
				{id: 'bob', mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)

			const nodeSnapshot = structuredClone(graph.nodeList);

			const spy = vi.fn();
			replacements.forEach(node => {
				graph.emitter.on('node:replace', spy);
			});
			
			replacements.forEach(node => {
				expect(spy).toHaveBeenCalledWith<GraphEvents['node:replace'][]>({oldNode: nodeSnapshot.get(node.id) as Node, newNode: node});
			})

		});
		it('should emit the events in order (remove, add and replace) in waves', () => {
			const replacements = [
				{id: 'bob', mark: 'replacement'},
				{id: 'boris', mark: 'replacement'}
			] as const satisfies OneOrMore<Node>;
			
			graph
				.addNode(
					{id: 'bob', deps: ['boris'], mark: 'original'},
					{id: 'boris', mark: 'original'},
					{id: 'berte', mark: 'original'}
				)

			const nodeSnapshot = structuredClone(graph.nodeList);

			const spy = vi.fn();
			replacements.forEach(node => {
				graph.emitter.on('node:replace', spy);
			});
			
			let offset = 1
			replacements.forEach((node, index) => {
				expect(spy).toHaveBeenNthCalledWith<GraphEvents['node:remove'][]>(index + offset, {node, removalType: 'direct'});
			})
			offset += replacements.length;
			replacements.forEach((node, index) => {
				expect(spy).toHaveBeenNthCalledWith<GraphEvents['node:add'][]>(index + offset, {node})
			})
			offset += replacements.length;
			replacements.forEach((node, index) => {
				expect(spy).toHaveBeenNthCalledWith<GraphEvents['node:replace'][]>(index + offset, {oldNode: nodeSnapshot.get(node.id) as Node, newNode: node});
			})
		});
	});

	describe('nodeList', () => {
		let graph: Graph;
		const nodes = [
			{id: 'bob'},
			{id: 'boris', deps: ['berte', 'bob']},
			{id: 'berte', deps: ['bob']}
		] as const satisfies OneOrMore<Node>;

		beforeEach(() => {
			graph = new Graph()
				.addNode(...nodes);			
		})

		it('should be a map', () => {
			
			expect(graph.nodeList).toBeInstanceOf(Map);
		});
		it('should be mapping every node by its id', () => {
			const nodeList = graph.nodeList;
			nodes
			.forEach(node => {
				expect(nodeList.get(node.id)).toEqual(node);
			})
		});
		it('should not allow editing the graph state', () => {
			const nodeList = graph.nodeList;

			nodeList.set('billy', {id: 'billy'});

			expect(graph.nodeList.get('billy')).toBeUndefined();
		});
	});

	describe('nodes', () => {
		let graph: Graph;
		const initialNodes = [
			{id: 'bob'},
			{id: 'boris', deps: ['berte', 'bob']},
			{id: 'berte', deps: ['bob']},
			{id: 'billy'}
		] as const satisfies OneOrMore<Node>;

		beforeEach(() => {
			graph = new Graph()
				.addNode(...initialNodes);			
		})
		it('should hold the roots to the graph', () => {
			const rootsFromGraph = graph.nodes.map(({id}) => id);
			const rootsFromInit = (initialNodes as OneOrMore<Node>)
				.filter(node => typeof node.deps === 'undefined')
				.map(({id}) => id);

			expect(rootsFromGraph).toEqual(rootsFromInit);
		});
		it('should represent the graph as a tree', () => {
			expect(true).toBe(false);
		});
		it('should not allow editing the graph state', () => {
			
			expect(true).toBe(false);
		});
	});
});
