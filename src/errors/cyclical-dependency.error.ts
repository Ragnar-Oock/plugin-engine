import { NodeId } from "../graph.interface";

export default class CyclicalDependencyError extends Error {
	constructor(nodeId: NodeId) {
		super(`The node "${nodeId}" declares a dependency that directly or indirectly depends on it.`);
	}
}