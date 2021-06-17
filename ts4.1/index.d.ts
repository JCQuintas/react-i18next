import i18next, {
  ReactOptions,
  i18n,
  ThirdPartyModule,
  Resource,
  TOptions,
  StringMap,
  TFunctionResult,
} from 'i18next';
import * as React from 'react';

type Subtract<T extends K, K> = Omit<T, keyof K>;

/**
 * Due to a limitation/bug on typescript 4.1 (https://github.com/microsoft/TypeScript/issues/41406), we added
 * "extends infer A ? A : never" in a few places to suppress the error "Type instantiation is excessively deep and possibly infinite."
 * on cases where users have more than 22 namespaces. Once the issue is fixed, we can remove all instances of the workaround used.
 *
 * Reference of the bug reported: https://github.com/i18next/react-i18next/issues/1222
 */

/**
 * This interface can be augmented by users to add types to `react-i18next` default resources.
 *
 * @deprecated use the `resources` key of `CustomTypeOptions` instead
 */
export interface Resources {}
/**
 * This interface can be augmented by users to add types to `react-i18next`. It accepts a `defaultNS` and `resources` properties.
 *
 * Usage:
 * ```ts
 * // react-i18next.d.ts
 * import 'react-i18next';
 * declare module 'react-i18next' {
 *   interface CustomTypeOptions {
 *     defaultNS: 'custom';
 *     resources: {
 *       custom: {
 *         foo: 'foo';
 *       };
 *     };
 *   }
 * }
 * ```
 */
export interface CustomTypeOptions {}

type MergeBy<T, K> = Omit<T, keyof K> & K;

type TypeOptions = MergeBy<
  {
    defaultNS: 'translation';
    resources: Resources;
  },
  CustomTypeOptions
>;

type DefaultResources = TypeOptions['resources'];
type DefaultNamespace<T = TypeOptions['defaultNS']> = T extends Fallback<string> ? T : string;

type Fallback<F, T = keyof DefaultResources> = [T] extends [never] ? F : T;

export type Namespace<F = Fallback<string>> = F | F[];

export function setDefaults(options: ReactOptions): void;
export function getDefaults(): ReactOptions;
export function setI18n(instance: i18n): void;
export function getI18n(): i18n;
export const initReactI18next: ThirdPartyModule;
export function composeInitialProps(ForComponent: any): (ctx: unknown) => Promise<any>;
export function getInitialProps(): {
  initialI18nStore: {
    [ns: string]: {};
  };
  initialLanguage: string;
};

export interface ReportNamespaces {
  addUsedNamespaces(namespaces: Namespace[]): void;
  getUsedNamespaces(): string[];
}

declare module 'i18next' {
  interface i18n {
    reportNamespaces: ReportNamespaces;
  }
}

type KeyWithSeparator<K, C> = `${K & string}_${C & string}`;
type ChainedKeys<K1, K2> = `${K1 & string}.${K2 & string}`;
type NamespacedKeys<NS, K> = `${NS & string}:${K & string}`;

type KeyContext<K> = K extends KeyWithSeparator<string, infer C> ? KeyContext<C> : K;
type KeyWithoutContext<K> = K extends KeyWithSeparator<infer KS, KeyContext<K>> ? KS : K;

// Normalize single namespace
type AppendKeys<K1, K2> = K2 extends KeyWithSeparator<string, string>
  ? ChainedKeys<K1, KeyWithoutContext<K2> | K2>
  : ChainedKeys<K1, K2>;

type AppendKeys2<K1, K2> = K2 extends KeyWithSeparator<string, string>
  ? ChainedKeys<K1, Exclude<KeyWithoutContext<K2> | K2, keyof any[]>>
  : ChainedKeys<K1, Exclude<K2, keyof any[]>>;

type Normalize2<T, K = keyof T> = K extends keyof T
  ? T[K] extends Record<string, any>
    ? T[K] extends readonly any[]
      ? AppendKeys2<K, keyof T[K] | Normalize2<T[K]>>
      : AppendKeys<K, keyof T[K] | Normalize2<T[K]>>
    : never
  : never;

type Normalize<T, KT = keyof T> = KT extends KeyWithSeparator<string, string>
  ? KeyWithoutContext<KT> | KT | Normalize2<KeyWithoutContext<KT>>
  : KT | Normalize2<T>;

// Normalize multiple namespaces
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;
type LastOf<T> = UnionToIntersection<T extends any ? () => T : never> extends () => infer R
  ? R
  : never;

type NormalizeMulti<T, U extends keyof T, L = LastOf<U>> = L extends U
  ? NamespacedKeys<L, Normalize<T[L]>> | NormalizeMulti<T, Exclude<U, L>>
  : never;

type KeyOrNever<T, K> = K extends keyof T ? K : never;

type NormalizeReturn<T, V, KT = keyof T> = V extends ChainedKeys<infer K, infer R>
  ? K extends keyof T
    ? NormalizeReturn<T[K], R>
    : never
  : V extends string
  ? KT extends KeyWithSeparator<V, infer C>
    ? T[KeyOrNever<T, KeyWithSeparator<V, C> | V>]
    : V extends keyof T
    ? T[V]
    : never
  : never;

type NormalizeMultiReturn<T, V> = V extends NamespacedKeys<infer N, infer R>
  ? N extends keyof T
    ? NormalizeReturn<T[N], R>
    : never
  : never;

export type TFuncKey<
  N extends Namespace = DefaultNamespace,
  T = DefaultResources
> = N extends (keyof T)[]
  ? NormalizeMulti<T, N[number]>
  : N extends keyof T
  ? Normalize<T[N]>
  : string;

export type TFuncReturn<N, TKeys, TDefaultResult, T = DefaultResources> = N extends (keyof T)[]
  ? NormalizeMultiReturn<T, TKeys>
  : N extends keyof T
  ? NormalizeReturn<T[N], TKeys>
  : Fallback<TDefaultResult>;

type AllContextsForKey<
  N extends Namespace,
  K extends TKeys | TKeys[],
  TKeys = TFuncKey<N> | TemplateStringsArray extends infer A ? A : never,
  TFK = TFuncKey<N>
> = TFK extends KeyWithSeparator<K, infer C> ? C : never;

type OptionsWithContext<Context extends any = any> = Omit<TOptions, 'context'> & {
  context?: Context;
};

export interface TFunction<N extends Namespace = DefaultNamespace> {
  <
    TKeys extends TFuncKey<N> | TemplateStringsArray extends infer A ? A : never,
    Key extends TKeys | TKeys[],
    Options extends OptionsWithContext<AllContextsForKey<N, Key>> | string,
    TDefaultResult extends TFunctionResult = string
  >(
    key: Key,
    options?: Options,
  ): TFuncReturn<N, TKeys, TDefaultResult>;
  <
    TKeys extends TFuncKey<N> | TemplateStringsArray extends infer A ? A : never,
    Key extends TKeys | TKeys[],
    Options extends OptionsWithContext<AllContextsForKey<N, Key>> | string,
    TDefaultResult extends TFunctionResult = string
  >(
    key: Key,
    defaultValue?: string,
    options?: Options,
  ): TFuncReturn<N, TKeys, TDefaultResult>;
}

export interface TransProps<
  K extends TFuncKey<N> extends infer A ? A : never,
  N extends Namespace = DefaultNamespace,
  E extends Element = HTMLDivElement
> extends React.HTMLProps<E> {
  children?: React.ReactNode;
  components?: readonly React.ReactNode[] | { readonly [tagName: string]: React.ReactNode };
  count?: number;
  defaults?: string;
  i18n?: i18n;
  i18nKey?: K | K[];
  ns?: N;
  parent?: string | React.ComponentType<any> | null; // used in React.createElement if not null
  tOptions?: {};
  values?: {};
  t?: TFunction<N>;
}
export function Trans<
  K extends TFuncKey<N> extends infer A ? A : never,
  N extends Namespace = DefaultNamespace,
  E extends Element = HTMLDivElement
>(props: TransProps<K, N, E>): React.ReactElement;

export function useSSR(initialI18nStore: Resource, initialLanguage: string): void;

export interface UseTranslationOptions {
  i18n?: i18n;
  useSuspense?: boolean;
}

type UseTranslationResponse<N extends Namespace> = [TFunction<N>, i18n, boolean] & {
  t: TFunction<N>;
  i18n: i18n;
  ready: boolean;
};

export function useTranslation<N extends Namespace = DefaultNamespace>(
  ns?: N,
  options?: UseTranslationOptions,
): UseTranslationResponse<N>;

// Need to see usage to improve this
export function withSSR(): <Props>(
  WrappedComponent: React.ComponentType<Props>,
) => {
  ({
    initialI18nStore,
    initialLanguage,
    ...rest
  }: {
    initialI18nStore: Resource;
    initialLanguage: string;
  } & Props): React.FunctionComponentElement<Props>;
  getInitialProps: (ctx: unknown) => Promise<any>;
};

export interface WithTranslation<N extends Namespace = DefaultNamespace> {
  t: TFunction<N>;
  i18n: i18n;
  tReady: boolean;
}

export interface WithTranslationProps {
  i18n?: i18n;
  useSuspense?: boolean;
}

export function withTranslation<N extends Namespace = DefaultNamespace>(
  ns?: N,
  options?: {
    withRef?: boolean;
  },
): <
  C extends React.ComponentType<React.ComponentProps<C> & WithTranslationProps>,
  ResolvedProps = JSX.LibraryManagedAttributes<
    C,
    Subtract<React.ComponentProps<C>, WithTranslationProps>
  >
>(
  component: C,
) => React.ComponentType<Omit<ResolvedProps, keyof WithTranslation<N>> & WithTranslationProps>;

export interface I18nextProviderProps {
  i18n: i18n;
  defaultNS?: string;
}

export const I18nextProvider: React.FunctionComponent<I18nextProviderProps>;
export const I18nContext: React.Context<{ i18n: i18n }>;

export interface TranslationProps<N extends Namespace = DefaultNamespace> {
  children: (
    t: TFunction<N>,
    options: {
      i18n: i18n;
      lng: string;
    },
    ready: boolean,
  ) => React.ReactNode;
  ns?: N;
  i18n?: i18n;
  useSuspense?: boolean;
}

export function Translation<N extends Namespace = DefaultNamespace>(
  props: TranslationProps<N>,
): any;
