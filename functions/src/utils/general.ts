import { isEqual } from "lodash";
import { isNullOrUndefined } from "util";

const isEquivalent = (before: any, after: any) => {
    return before && typeof before.isEqual === 'function' ? before.isEqual(after): isEqual(before, after);
}

export function changeOcurred(before: any, after: any): boolean {
    if (!isNullOrUndefined(before.favorite_for) && !isNullOrUndefined(after.favorite_for) && !isEquivalent(before.favorite_for, after.favorite_for))
        return true
    return false
}