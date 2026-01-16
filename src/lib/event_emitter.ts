"use strict";

export type AnyFn = (...args: any[]) => any;

export type EmitParameters<F> =
	F extends (...args: infer P) => any ? P : never;

export interface InternalEvent {
	type?: string;
	propagationStopped?: boolean;
	defaultPrevented?: boolean;
	stopPropagation?: () => void;
	preventDefault?: () => void;
}

var stopPropagation = function(this: InternalEvent) { this.propagationStopped = true; };
var preventDefault = function(this: InternalEvent) { this.defaultPrevented = true; };

export class EventEmitter<T extends { [K in keyof T]: AnyFn } = Dict<AnyFn>> {
	protected _eventRegistry?: {
		[K in keyof T]?: Array<T[K]>
	}

	protected _defaultHandlers?: {
		[K in keyof T]?: AnyFn | undefined;
	};

	/* ---------------- dispatch core ---------------- */

	// _dispatchEvent<K extends keyof T>(eventName: K, ...args: EmitParameters<T[K]>): void;
	_dispatchEvent<K extends keyof T>(eventName: K, e?: InternalEvent): void {
		this._eventRegistry || (this._eventRegistry = {});
		let handlers = this._defaultHandlers;
		if (!handlers)
			this._defaultHandlers = handlers = { _disabled_: {} } as any;

		var listeners = this._eventRegistry[eventName] || [];
		var defaultHandler = handlers![eventName];
		if (!listeners.length && !defaultHandler)
			return;

		if (typeof e != "object" || !e)
			e = {};

		if (!e.type)
			e.type = String(eventName);
		if (!e.stopPropagation)
			e.stopPropagation = stopPropagation;
		if (!e.preventDefault)
			e.preventDefault = preventDefault;

		listeners = listeners.slice();
		for (var i=0; i<listeners.length; i++) {
			listeners[i](e, this);
			if (e.propagationStopped)
				break;
		}
		
		if (defaultHandler && !e.defaultPrevented)
			return defaultHandler(e, this);
	}

	// _emit<K extends keyof T>(eventName: K, ...args: EmitParameters<T[K]>): void;
	_emit<K extends keyof T>(eventName: K, ...args: EmitParameters<T[K]>): void {
		return this._dispatchEvent(eventName, ...args);
	}

	// _signal<K extends keyof T>(eventName: K, ...args: EmitParameters<T[K]>): void;
	_signal<K extends keyof T>(eventName: K, ...args: EmitParameters<T[K]>): void {
		let listeners = this._eventRegistry?.[eventName];
		if (!listeners)
			return;
		listeners = listeners.slice();
		for (var i=0; i<listeners.length; i++)
			listeners[i](...args, this);
	}

	/* ---------------- listener API ---------------- */

	// on<K extends keyof T>(name: K, callback: T[K], capturing?: boolean): T[K];
	on<K extends keyof T>(name: K, callback: T[K], capturing?: boolean): T[K] {
		return this.addEventListener(name, callback, capturing);
	}

	// addEventListener<K extends keyof T>(name: K, callback: T[K], capturing?: boolean): T[K];
	addEventListener<K extends keyof T>(name: K, callback: T[K], capturing?: boolean): T[K] {
		this._eventRegistry ||= {};

		let listeners = this._eventRegistry[name];
		if (!listeners)
			listeners = (this._eventRegistry)[name] = [];

		if (listeners.indexOf(callback) === -1) {
			listeners[capturing ? "unshift" : "push"](callback);
		}
		return callback;
	}

	// off<K extends keyof T>(name: K, callback: T[K]): void;
	off<K extends keyof T>(name: K, callback: T[K]): void {
		this.removeEventListener(name, callback);
	}

	// removeListener<K extends keyof T>(name: K, callback: T[K]): void;
	removeListener<K extends keyof T>(name: K, callback: T[K]): void {
		this.removeEventListener(name, callback);
	}

	// removeEventListener<K extends keyof T>(name: K, callback: T[K]): void;
	removeEventListener<K extends keyof T>(name: K, callback: T[K]): void {
		const listeners = this._eventRegistry?.[name];
		if (!listeners) return;

		const index = listeners.indexOf(callback);
		if (index !== -1) listeners.splice(index, 1);
	}

	// removeAllListeners(name?: string): void;
	removeAllListeners(name?: keyof T): void {
		if (!name) {
			this._eventRegistry = undefined;
			this._defaultHandlers = undefined;
			return;
		}
		if (this._eventRegistry) this._eventRegistry[name] = undefined;
		if (this._defaultHandlers) this._defaultHandlers[name] = undefined;
	}

	/* ---------------- once ---------------- */

	// once<K extends keyof T>(eventName: K, callback: T[K]): void;
	once<K extends keyof T>(eventName: K, callback: T[K]): void {
		var _self = this;
		this.on(eventName, function newCallback(this: any, ...args: any[]) {
			_self.off(eventName, newCallback as any);
			callback.apply(null, args as any);
		} as any);
		if (!callback) {
			/*global Promise*/
			// return new Promise(function(resolve) {
			// 	callback = resolve;
			// });
		}
	}

	/* ---------------- default handler ---------------- */

	setDefaultHandler<K extends keyof T>(name: K, callback:  T[K]): void {
		let handlers = this._defaultHandlers!;
		if (!handlers)
			this._defaultHandlers = handlers = { _disabled_: {} } as any;

		if (handlers[name]) {
			let old = handlers[name];
			let disabled = (handlers as any)._disabled_[name];
			if (!disabled)
				(handlers as any)._disabled_[name] = disabled = [];
			disabled.push(old);
			let i = disabled.indexOf(callback);
			if (i !== -1)
				disabled.splice(i, 1);
		}
		handlers[name] = callback;
	}

	removeDefaultHandler<K extends keyof T>(name: K, callback:  T[K]): void {
		const handlers = this._defaultHandlers;
		if (!handlers) return;

		const disabled = (handlers as any)._disabled_[name];
		if (handlers[name] === callback) {
			if (disabled && disabled.length)
				this.setDefaultHandler(name, disabled.pop()!);
		} else if (disabled) {
			const i = disabled.indexOf(callback);
			if (i !== -1) disabled.splice(i, 1);
		}
	}
}


