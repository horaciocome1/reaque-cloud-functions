import { isEqual } from "lodash";

export const isEquivalent = (before: any, after: any) => {
    return before && typeof before.isEqual === 'function' ? before.isEqual(after): isEqual(before, after);
}