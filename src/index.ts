if (typeof Reflect === 'undefined' || !Reflect.getMetadata) {
  throw new Error(
    `requires a reflect polyfill. Please add 'import "reflect-metadata"' to the top of your entry point.`
  );
}

export {ref} from './ref.js';
export {Token} from './token.js';
export {container} from './container.js';
export {Inject} from './decorators/inject.js';
export {Injectable} from './decorators/injectable.js';

export type {ServiceProvider} from './types/provider.js';
export type {Disposable} from './types/disposable.js';
export type {Constructor} from './types/constructor.js';
export type {ServiceIdentifier} from './types/identifier.js';
