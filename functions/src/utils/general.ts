import { isEqual } from "lodash";
import { isNullOrUndefined } from "util";

const isEquivalent = (before: any, after: any) => {
    return before && typeof before.isEqual === 'function' ? before.isEqual(after): isEqual(before, after);
}

export function changeOcurred(before: any, after: any): boolean {
    if (!isNullOrUndefined(before) && !isNullOrUndefined(after) && !isEquivalent(before, after))
        return true
    return false
}