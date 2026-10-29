import type { fr } from "./fr";

export type TKey = keyof typeof fr;
export type Dict = Record<TKey, string>;
type BaseOf<K> = K extends `${infer B}_one` ? B : never;
/** Keys that come in `_one` / `_other` forms */
export type PluralKey = BaseOf<TKey>;
