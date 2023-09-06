type Comparator<T> = (a: T, b: T) => number;

export function insertionIndex<T>(array: T[], compare: Comparator<T>, value: T): number {
    let left = 0, right = array.length;
    while(left < right) {
        const mid = (left + right) >>> 1;
        const midValue = <T>array[mid];
        if(compare(midValue, value) < 0) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    return left;
}

export function bSearch<T>(array: T[], compare: Comparator<T>, value: T): number {
    let left = 0, right = array.length - 1;
    while(left <= right) {
        const mid = (left + right) >>> 1;
        const midValue = <T>array[mid];
        const c = compare(midValue, value);
        if(c < 0) {
            left = mid + 1;
        } else if(c > 0) {
            right = mid - 1;
        } else {
            return mid;
        }
    }
    return -1;
}