import { GraphInterface, NodeId } from "../graph.interface";

export default class MissingDependencyError extends Error {
	constructor(nodeId: NodeId, dependencies: ReadonlyArray<NodeId>, graph: GraphInterface) {
		const missingDeps = dependencies.filter(dep => graph.nodeList.has(dep));
		const nbDeps = missingDeps.length;
		const message = nbDeps === 1
			? `The Node "${nodeId}" declares a dependency on "${missingDeps[0]}" but it isn't in the graph yet, did you forget to register it ?`
			: `The Node "${nodeId}" declares a dependency on ${missingDeps.map(dep => `"${dep}"`).join(', ')} but they aren't in the graph yet, did you forget to register them ?`;

		super(message);
	}
}