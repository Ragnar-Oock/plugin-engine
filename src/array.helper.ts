
export type OneOrMore<T> = readonly [T, ...T[]];


export function hasOneOrMore<T>(candidate: ReadonlyArray<T>): candidate is OneOrMore<T> {
	return candidate.length > 0;
}