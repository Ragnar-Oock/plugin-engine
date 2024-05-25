import { describe, expect, it, vi } from "vitest";

import Graph from '../src/graph.model';
import MissingDependencyError from '../src/errors/missing-dependency.error';
import CyclicalDependencyError from '../src/errors/cyclical-dependency.error';

describe('grap', () => {
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
	});

	describe('removeNode (single)', () => {
		it('should remove a node with no dependents', () => {
			const graph = new Graph();

			graph.addNode({id: 'bob'});

			graph.removeNode('bob');
			expect(graph.nodeList.size).toBe(0);
		});
		it('should prune dependent nodes', () => {
			const graph = new Graph();

			graph.addNode(
				{id: 'bob'},
				{id: 'boris', deps: ['bob']}
			);

			graph.removeNode('bob');
			console.log(graph.nodeList);
			
			expect(graph.nodeList.size).toBe(0);
		});
		it('should emit a "node:remove" event (direct)', () => {
			const graph = new Graph();
			const node = {id: 'bob'};

			graph.addNode(node);
			const spy = vi.fn();
			graph.emitter.on('node:remove', spy);
			graph.removeNode('bob');

			expect(spy).toHaveBeenLastCalledWith({node});
		});
		it('should emit a "node:remove" event (prune)', () => {
			const graph = new Graph();

			const bob = {id: 'bob'};
			const boris = {id: 'boris'};
			graph.addNode(bob, boris);

			const spy = vi.fn();
			graph.emitter.on('node:remove', spy);
			graph.removeNode(bob.id);

			expect(spy).toHaveBeenNthCalledWith(2);

			// expect(spy).toHaveBeenCalledWith({node: bob, removalType: 'direct'});
			// expect(spy).toHaveBeenCalledWith({node: boris, removalType: 'prune'});
		});
		it('should not fail to remove an inexistant node', () => {
			const graph = new Graph();

			graph.removeNode('bob');

			expect(true).toBe(true);
		})
	})

});
