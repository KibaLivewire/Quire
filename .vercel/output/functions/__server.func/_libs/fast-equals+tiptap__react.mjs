import { i as __toESM } from "../_runtime.mjs";
import { l as require_react_dom, u as require_react } from "./@floating-ui/react-dom+[...].mjs";
import { _ as require_with_selector, v as require_shim } from "./@tanstack/react-router+[...].mjs";
import { F as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
import { n as Editor } from "./@tiptap/core+[...].mjs";
//#region node_modules/fast-equals/dist/es/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var import_shim = require_shim();
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1);
var { getOwnPropertyNames, getOwnPropertySymbols } = Object;
var { hasOwnProperty } = Object.prototype;
/**
* Combine two comparators into a single comparators.
*/
function combineComparators(comparatorA, comparatorB) {
	return function isEqual(a, b, state) {
		return comparatorA(a, b, state) && comparatorB(a, b, state);
	};
}
/**
* Wrap the provided `areItemsEqual` method to manage the circular state, allowing
* for circular references to be safely included in the comparison without creating
* stack overflows.
*/
function createIsCircular(areItemsEqual) {
	return function isCircular(a, b, state) {
		if (!a || !b || typeof a !== "object" || typeof b !== "object") return areItemsEqual(a, b, state);
		const { cache } = state;
		const cachedA = cache.get(a);
		const cachedB = cache.get(b);
		if (cachedA && cachedB) return cachedA === b && cachedB === a;
		cache.set(a, b);
		cache.set(b, a);
		const result = areItemsEqual(a, b, state);
		cache.delete(a);
		cache.delete(b);
		return result;
	};
}
/**
* Get the `@@toStringTag` of the value, if it exists.
*/
function getShortTag(value) {
	return value != null ? value[Symbol.toStringTag] : void 0;
}
/**
* Get the properties to strictly examine, which include both own properties that are
* not enumerable and symbol properties.
*/
function getStrictProperties(object) {
	return getOwnPropertyNames(object).concat(getOwnPropertySymbols(object));
}
/**
* Whether the object contains the property passed as an own property.
*/
var hasOwn = Object.hasOwn || ((object, property) => hasOwnProperty.call(object, property));
/**
* Whether the values passed are strictly equal or both NaN.
*/
function sameValueZeroEqual(a, b) {
	return a === b || !a && !b && a !== a && b !== b;
}
var PREACT_VNODE = "__v";
var PREACT_OWNER = "__o";
var REACT_OWNER = "_owner";
var HAS_FLOAT_16_ARRAY = typeof Float16Array !== "undefined";
var { getOwnPropertyDescriptor, keys } = Object;
/**
* Whether the array buffers are equal in value.
*/
function areArrayBuffersEqual(a, b) {
	return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a), new Uint8Array(b));
}
/**
* Whether the arrays are equal in value.
*/
function areArraysEqual(a, b, state) {
	let index = a.length;
	if (b.length !== index) return false;
	while (index-- > 0) if (!state.equals(a[index], b[index], index, index, a, b, state)) return false;
	return true;
}
/**
* Whether the dataviews are equal in value.
*/
function areDataViewsEqual(a, b) {
	return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
}
/**
* Whether the dates passed are equal in value.
*/
function areDatesEqual(a, b) {
	return sameValueZeroEqual(a.getTime(), b.getTime());
}
/**
* Whether the errors passed are equal in value.
*/
function areErrorsEqual(a, b, state) {
	return a.name === b.name && a.message === b.message && a.stack === b.stack && state.equals(a.cause, b.cause, "cause", "cause", a, b, state);
}
/**
* Whether the functions passed are equal in value.
*/
function areFunctionsEqual(a, b) {
	return a === b;
}
/**
* Whether the `Map`s are equal in value.
*/
function areMapsEqual(a, b, state) {
	const size = a.size;
	if (size !== b.size) return false;
	if (!size) return true;
	const matchedIndices = new Array(size);
	const aIterable = a.entries();
	let aResult;
	let bResult;
	let index = 0;
	while (aResult = aIterable.next()) {
		if (aResult.done) break;
		const bIterable = b.entries();
		let hasMatch = false;
		let matchIndex = 0;
		while (bResult = bIterable.next()) {
			if (bResult.done) break;
			if (matchedIndices[matchIndex]) {
				matchIndex++;
				continue;
			}
			const aEntry = aResult.value;
			const bEntry = bResult.value;
			if (state.equals(aEntry[0], bEntry[0], index, matchIndex, a, b, state) && state.equals(aEntry[1], bEntry[1], aEntry[0], bEntry[0], a, b, state)) {
				hasMatch = matchedIndices[matchIndex] = true;
				break;
			}
			matchIndex++;
		}
		if (!hasMatch) return false;
		index++;
	}
	return true;
}
/**
* Whether the numbers are equal in value.
*/
var areNumbersEqual = sameValueZeroEqual;
/**
* Whether the objects are equal in value.
*/
function areObjectsEqual(a, b, state) {
	const properties = keys(a);
	let index = properties.length;
	if (keys(b).length !== index) return false;
	while (index-- > 0) if (!isPropertyEqual(a, b, state, properties[index])) return false;
	return true;
}
/**
* Whether the objects are equal in value with strict property checking.
*/
function areObjectsEqualStrict(a, b, state) {
	const properties = getStrictProperties(a);
	let index = properties.length;
	if (getStrictProperties(b).length !== index) return false;
	let property;
	let descriptorA;
	let descriptorB;
	while (index-- > 0) {
		property = properties[index];
		if (!isPropertyEqual(a, b, state, property)) return false;
		descriptorA = getOwnPropertyDescriptor(a, property);
		descriptorB = getOwnPropertyDescriptor(b, property);
		if ((descriptorA || descriptorB) && (!descriptorA || !descriptorB || descriptorA.configurable !== descriptorB.configurable || descriptorA.enumerable !== descriptorB.enumerable || descriptorA.writable !== descriptorB.writable)) return false;
	}
	return true;
}
/**
* Whether the primitive wrappers passed are equal in value.
*/
function arePrimitiveWrappersEqual(a, b) {
	return sameValueZeroEqual(a.valueOf(), b.valueOf());
}
/**
* Whether the regexps passed are equal in value.
*/
function areRegExpsEqual(a, b) {
	return a.source === b.source && a.flags === b.flags;
}
/**
* Whether the `Set`s are equal in value.
*/
function areSetsEqual(a, b, state) {
	const size = a.size;
	if (size !== b.size) return false;
	if (!size) return true;
	const matchedIndices = new Array(size);
	const aIterable = a.values();
	let aResult;
	let bResult;
	while (aResult = aIterable.next()) {
		if (aResult.done) break;
		const bIterable = b.values();
		let hasMatch = false;
		let matchIndex = 0;
		while (bResult = bIterable.next()) {
			if (bResult.done) break;
			if (!matchedIndices[matchIndex] && state.equals(aResult.value, bResult.value, aResult.value, bResult.value, a, b, state)) {
				hasMatch = matchedIndices[matchIndex] = true;
				break;
			}
			matchIndex++;
		}
		if (!hasMatch) return false;
	}
	return true;
}
/**
* Whether the TypedArray instances are equal in value.
*/
function areTypedArraysEqual(a, b) {
	let index = a.length;
	if (b.length !== index || a.byteOffset !== b.byteOffset) return false;
	if (a instanceof Float64Array || a instanceof Float32Array || HAS_FLOAT_16_ARRAY && a instanceof Float16Array) {
		while (index-- > 0) if (a[index] !== b[index] && (a[index] === a[index] || b[index] === b[index])) return false;
		return true;
	}
	while (index-- > 0) if (a[index] !== b[index]) return false;
	return true;
}
/**
* Whether the URL instances are equal in value.
*/
function areUrlsEqual(a, b) {
	if (a.href === b.href) return true;
	return a.protocol === b.protocol && a.username === b.username && a.password === b.password && a.host === b.host && a.pathname === b.pathname && a.hash === b.hash && areSearchParamsEqual(a.searchParams, b.searchParams);
}
/**
* Whether the search params passed are equal in value.
*
* @note
* Order is not significant, matching how the other unordered collections in the library are
* compared. Repeated keys are, so this is a comparison of multisets rather than of sets:
* `a=1&a=2` is equal to `a=2&a=1`, but not to `a=1&a=1`.
*/
function areSearchParamsEqual(a, b) {
	const serializedA = a.toString();
	const serializedB = b.toString();
	return serializedA === serializedB || sortSearchParams(serializedA) === sortSearchParams(serializedB);
}
/**
* Reorder a serialized query string so that params holding the same pairs compare as equal
* regardless of the order they appear in.
*
* @note
* The serializer percent-encodes `&` and `=` wherever they appear inside a name or a value, so
* splitting on `&` recovers exactly the pairs and nothing else.
*/
function sortSearchParams(serialized) {
	return serialized.split("&").sort().join("&");
}
function isPropertyEqual(a, b, state, property) {
	if ((property === REACT_OWNER || property === PREACT_OWNER || property === PREACT_VNODE) && (a.$$typeof || b.$$typeof)) return true;
	return hasOwn(b, property) && state.equals(a[property], b[property], property, property, a, b, state);
}
var ARRAY_BUFFER_TAG = "[object ArrayBuffer]";
var ARGUMENTS_TAG = "[object Arguments]";
var BOOLEAN_TAG = "[object Boolean]";
var DATA_VIEW_TAG = "[object DataView]";
var DATE_TAG = "[object Date]";
var ERROR_TAG = "[object Error]";
var MAP_TAG = "[object Map]";
var NUMBER_TAG = "[object Number]";
var OBJECT_TAG = "[object Object]";
var REG_EXP_TAG = "[object RegExp]";
var SET_TAG = "[object Set]";
var STRING_TAG = "[object String]";
var TYPED_ARRAY_TAGS = {
	"[object Int8Array]": true,
	"[object Uint8Array]": true,
	"[object Uint8ClampedArray]": true,
	"[object Int16Array]": true,
	"[object Uint16Array]": true,
	"[object Int32Array]": true,
	"[object Uint32Array]": true,
	"[object Float16Array]": true,
	"[object Float32Array]": true,
	"[object Float64Array]": true,
	"[object BigInt64Array]": true,
	"[object BigUint64Array]": true
};
var URL_TAG = "[object URL]";
var toString = Object.prototype.toString;
/**
* Create a comparator method based on the type-specific equality comparators passed.
*/
function createEqualityComparator({ areArrayBuffersEqual, areArraysEqual, areDataViewsEqual, areDatesEqual, areErrorsEqual, areFunctionsEqual, areMapsEqual, areNumbersEqual, areObjectsEqual, arePrimitiveWrappersEqual, areRegExpsEqual, areSetsEqual, areTypedArraysEqual, areUrlsEqual, unknownTagComparators }) {
	/**
	* compare the value of the two objects and return true if they are equivalent in values
	*/
	return function comparator(a, b, state) {
		if (a === b) return true;
		if (a == null || b == null) return false;
		const type = typeof a;
		if (type !== typeof b) return false;
		if (type !== "object") {
			if (type === "number") return areNumbersEqual(a, b, state);
			if (type === "function") return areFunctionsEqual(a, b, state);
			return false;
		}
		const constructor = a.constructor;
		if (constructor !== b.constructor) return false;
		if (constructor === Object) return areObjectsEqual(a, b, state);
		if (Array.isArray(a)) return areArraysEqual(a, b, state);
		if (constructor === Date) return areDatesEqual(a, b, state);
		if (constructor === RegExp) return areRegExpsEqual(a, b, state);
		if (constructor === Map) return areMapsEqual(a, b, state);
		if (constructor === Set) return areSetsEqual(a, b, state);
		const tag = toString.call(a);
		if (tag === DATE_TAG) return areDatesEqual(a, b, state);
		if (tag === REG_EXP_TAG) return areRegExpsEqual(a, b, state);
		if (tag === MAP_TAG) return areMapsEqual(a, b, state);
		if (tag === SET_TAG) return areSetsEqual(a, b, state);
		if (tag === OBJECT_TAG) return typeof a.then !== "function" && typeof b.then !== "function" && areObjectsEqual(a, b, state);
		if (tag === URL_TAG) return areUrlsEqual(a, b, state);
		if (tag === ERROR_TAG) return areErrorsEqual(a, b, state);
		if (tag === ARGUMENTS_TAG) return areObjectsEqual(a, b, state);
		if (TYPED_ARRAY_TAGS[tag]) return areTypedArraysEqual(a, b, state);
		if (tag === ARRAY_BUFFER_TAG) return areArrayBuffersEqual(a, b, state);
		if (tag === DATA_VIEW_TAG) return areDataViewsEqual(a, b, state);
		if (tag === BOOLEAN_TAG || tag === NUMBER_TAG || tag === STRING_TAG) return arePrimitiveWrappersEqual(a, b, state);
		if (unknownTagComparators) {
			let unknownTagComparator = unknownTagComparators[tag];
			if (!unknownTagComparator) {
				const shortTag = getShortTag(a);
				if (shortTag) unknownTagComparator = unknownTagComparators[shortTag];
			}
			if (unknownTagComparator) return unknownTagComparator(a, b, state);
		}
		return false;
	};
}
/**
* Create the configuration object used for building comparators.
*/
function createEqualityComparatorConfig({ circular, createCustomConfig, strict }) {
	let config = {
		areArrayBuffersEqual,
		areArraysEqual: strict ? areObjectsEqualStrict : areArraysEqual,
		areDataViewsEqual,
		areDatesEqual,
		areErrorsEqual: strict ? combineComparators(areErrorsEqual, areObjectsEqualStrict) : combineComparators(areErrorsEqual, areObjectsEqual),
		areFunctionsEqual,
		areMapsEqual: strict ? combineComparators(areMapsEqual, areObjectsEqualStrict) : areMapsEqual,
		areNumbersEqual,
		areObjectsEqual: strict ? areObjectsEqualStrict : areObjectsEqual,
		arePrimitiveWrappersEqual,
		areRegExpsEqual,
		areSetsEqual: strict ? combineComparators(areSetsEqual, areObjectsEqualStrict) : areSetsEqual,
		areTypedArraysEqual: strict ? combineComparators(areTypedArraysEqual, areObjectsEqualStrict) : areTypedArraysEqual,
		areUrlsEqual,
		unknownTagComparators: void 0
	};
	if (createCustomConfig) config = Object.assign({}, config, createCustomConfig(config));
	if (circular) {
		const areArraysEqual = createIsCircular(config.areArraysEqual);
		const areErrorsEqual = createIsCircular(config.areErrorsEqual);
		const areMapsEqual = createIsCircular(config.areMapsEqual);
		const areObjectsEqual = createIsCircular(config.areObjectsEqual);
		const areSetsEqual = createIsCircular(config.areSetsEqual);
		config = Object.assign({}, config, {
			areArraysEqual,
			areErrorsEqual,
			areMapsEqual,
			areObjectsEqual,
			areSetsEqual
		});
	}
	return config;
}
/**
* Default equality comparator pass-through, used as the standard `isEqual` creator for
* use inside the built comparator.
*/
function createInternalEqualityComparator(compare) {
	return function(a, b, _indexOrKeyA, _indexOrKeyB, _parentA, _parentB, state) {
		return compare(a, b, state);
	};
}
/**
* Create the `isEqual` function used by the consuming application.
*/
function createIsEqual({ circular, comparator, createState, equals, strict }) {
	if (createState) return function isEqual(a, b) {
		const { cache = circular ? /* @__PURE__ */ new WeakMap() : void 0, meta } = createState();
		return comparator(a, b, {
			cache,
			equals,
			meta,
			strict
		});
	};
	if (circular) return function isEqual(a, b) {
		return comparator(a, b, {
			cache: /* @__PURE__ */ new WeakMap(),
			equals,
			meta: void 0,
			strict
		});
	};
	const state = {
		cache: void 0,
		equals,
		meta: void 0,
		strict
	};
	return function isEqual(a, b) {
		return comparator(a, b, state);
	};
}
/**
* Whether the items passed are deeply-equal in value.
*/
var deepEqual = createCustomEqual();
createCustomEqual({ strict: true });
createCustomEqual({ circular: true });
createCustomEqual({
	circular: true,
	strict: true
});
createCustomEqual({ createInternalComparator: () => sameValueZeroEqual });
createCustomEqual({
	strict: true,
	createInternalComparator: () => sameValueZeroEqual
});
createCustomEqual({
	circular: true,
	createInternalComparator: () => sameValueZeroEqual
});
createCustomEqual({
	circular: true,
	createInternalComparator: () => sameValueZeroEqual,
	strict: true
});
/**
* Create a custom equality comparison method.
*
* This can be done to create very targeted comparisons in extreme hot-path scenarios
* where the standard methods are not performant enough, but can also be used to provide
* support for legacy environments that do not support expected features like
* `RegExp.prototype.flags` out of the box.
*/
function createCustomEqual(options = {}) {
	const { circular = false, createInternalComparator: createCustomInternalComparator, createState, strict = false } = options;
	const comparator = createEqualityComparator(createEqualityComparatorConfig(options));
	return createIsEqual({
		circular,
		comparator,
		createState,
		equals: createCustomInternalComparator ? createCustomInternalComparator(comparator) : createInternalEqualityComparator(comparator),
		strict
	});
}
//#endregion
//#region node_modules/@tiptap/react/dist/index.js
var import_with_selector = require_with_selector();
var mergeRefs = (...refs) => {
	return (node) => {
		refs.forEach((ref) => {
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		});
	};
};
/**
* This component renders all of the editor's node views.
*/
var Portals = ({ contentComponent }) => {
	const renderers = (0, import_shim.useSyncExternalStore)(contentComponent.subscribe, contentComponent.getSnapshot, contentComponent.getServerSnapshot);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: Object.values(renderers) });
};
function createContentComponent() {
	const subscribers = /* @__PURE__ */ new Set();
	let renderers = {};
	let isNotificationQueued = false;
	const notifySubscribers = () => {
		if (isNotificationQueued || !subscribers.size) return;
		isNotificationQueued = true;
		queueMicrotask(() => {
			isNotificationQueued = false;
			subscribers.forEach((subscriber) => subscriber());
		});
	};
	return {
		/**
		* Subscribe to the editor instance's changes.
		*/
		subscribe(callback) {
			subscribers.add(callback);
			return () => {
				subscribers.delete(callback);
			};
		},
		getSnapshot() {
			return renderers;
		},
		getServerSnapshot() {
			return renderers;
		},
		/**
		* Adds a new NodeView Renderer to the editor.
		*/
		setRenderer(id, renderer) {
			renderers = {
				...renderers,
				[id]: import_react_dom.createPortal(renderer.reactElement, renderer.element, id)
			};
			notifySubscribers();
		},
		/**
		* Removes a NodeView Renderer from the editor.
		*/
		removeRenderer(id) {
			const nextRenderers = { ...renderers };
			delete nextRenderers[id];
			renderers = nextRenderers;
			notifySubscribers();
		}
	};
}
var PureEditorContent = class extends import_react.Component {
	constructor(props) {
		super(props);
		this.editorContentRef = import_react.createRef();
	}
	componentDidMount() {
		this.init();
	}
	componentDidUpdate() {
		this.init();
	}
	init() {
		var _editor$view$dom;
		const editor = this.props.editor;
		if (editor && !editor.isDestroyed && ((_editor$view$dom = editor.view.dom) === null || _editor$view$dom === void 0 ? void 0 : _editor$view$dom.parentNode)) {
			if (editor.contentComponent) return;
			const element = this.editorContentRef.current;
			element.append(...editor.view.dom.parentNode.childNodes);
			editor.setOptions({ element });
			editor.contentComponent = createContentComponent();
			editor.createNodeViews();
			editor.isEditorContentInitialized = true;
			this.forceUpdate();
		}
	}
	componentWillUnmount() {
		const editor = this.props.editor;
		if (!editor) return;
		editor.isEditorContentInitialized = false;
		if (!editor.isDestroyed) editor.view.setProps({ nodeViews: {} });
		editor.contentComponent = null;
		try {
			var _editor$view$dom2;
			if (!((_editor$view$dom2 = editor.view.dom) === null || _editor$view$dom2 === void 0 ? void 0 : _editor$view$dom2.parentNode)) return;
			const newElement = document.createElement("div");
			newElement.append(...editor.view.dom.parentNode.childNodes);
			editor.setOptions({ element: newElement });
		} catch {}
	}
	render() {
		const { editor, innerRef, ...rest } = this.props;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: mergeRefs(innerRef, this.editorContentRef),
			...rest
		}), (editor === null || editor === void 0 ? void 0 : editor.contentComponent) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portals, { contentComponent: editor.contentComponent })] });
	}
};
var EditorContentWithKey = (0, import_react.forwardRef)((props, ref) => {
	const key = import_react.useMemo(() => {
		return Math.floor(Math.random() * 4294967295).toString();
	}, [props.editor]);
	return import_react.createElement(PureEditorContent, {
		key,
		innerRef: ref,
		...props
	});
});
var EditorContent = import_react.memo(EditorContentWithKey);
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? import_react.useLayoutEffect : import_react.useEffect;
/**
* To synchronize the editor instance with the component state,
* we need to create a separate instance that is not affected by the component re-renders.
*/
var EditorStateManager = class {
	constructor(initialEditor) {
		this.transactionNumber = 0;
		this.lastTransactionNumber = 0;
		this.subscribers = /* @__PURE__ */ new Set();
		this.editor = initialEditor;
		this.lastSnapshot = {
			editor: initialEditor,
			transactionNumber: 0
		};
		this.getSnapshot = this.getSnapshot.bind(this);
		this.getServerSnapshot = this.getServerSnapshot.bind(this);
		this.watch = this.watch.bind(this);
		this.subscribe = this.subscribe.bind(this);
	}
	/**
	* Get the current editor instance.
	*/
	getSnapshot() {
		if (this.transactionNumber === this.lastTransactionNumber) return this.lastSnapshot;
		this.lastTransactionNumber = this.transactionNumber;
		this.lastSnapshot = {
			editor: this.editor,
			transactionNumber: this.transactionNumber
		};
		return this.lastSnapshot;
	}
	/**
	* Always disable the editor on the server-side.
	*/
	getServerSnapshot() {
		return {
			editor: null,
			transactionNumber: 0
		};
	}
	/**
	* Subscribe to the editor instance's changes.
	*/
	subscribe(callback) {
		this.subscribers.add(callback);
		return () => {
			this.subscribers.delete(callback);
		};
	}
	/**
	* Watch the editor instance for changes.
	*/
	watch(nextEditor) {
		this.editor = nextEditor;
		if (this.editor) {
			/**
			* This will force a re-render when the editor state changes.
			* This is to support things like `editor.can().toggleBold()` in components that `useEditor`.
			* This could be more efficient, but it's a good trade-off for now.
			*/
			let lastTransaction;
			const fn = (props) => {
				if ((props === null || props === void 0 ? void 0 : props.transaction) !== void 0 && props.transaction === lastTransaction) return;
				lastTransaction = props === null || props === void 0 ? void 0 : props.transaction;
				this.transactionNumber += 1;
				this.subscribers.forEach((callback) => callback());
			};
			const currentEditor = this.editor;
			currentEditor.on("transaction", fn);
			currentEditor.on("update", fn);
			return () => {
				currentEditor.off("transaction", fn);
				currentEditor.off("update", fn);
			};
		}
	}
};
/**
* This hook allows you to watch for changes on the editor instance.
* It will allow you to select a part of the editor state and re-render the component when it changes.
* @example
* ```tsx
* const editor = useEditor({...options})
* const { currentSelection } = useEditorState({
*  editor,
*  selector: snapshot => ({ currentSelection: snapshot.editor.state.selection }),
* })
*/
function useEditorState(options) {
	var _options$equalityFn;
	const [editorStateManager] = (0, import_react.useState)(() => new EditorStateManager(options.editor));
	const selectedState = (0, import_with_selector.useSyncExternalStoreWithSelector)(editorStateManager.subscribe, editorStateManager.getSnapshot, editorStateManager.getServerSnapshot, options.selector, (_options$equalityFn = options.equalityFn) !== null && _options$equalityFn !== void 0 ? _options$equalityFn : deepEqual);
	useIsomorphicLayoutEffect(() => {
		return editorStateManager.watch(options.editor);
	}, [options.editor, editorStateManager]);
	(0, import_react.useDebugValue)(selectedState);
	return selectedState;
}
var isSSR = typeof window === "undefined";
var isNext = isSSR || Boolean(typeof window !== "undefined" && window.next);
/**
* This class handles the creation, destruction, and re-creation of the editor instance.
*/
var EditorInstanceManager = class EditorInstanceManager {
	constructor(options) {
		this.editor = null;
		this.subscriptions = /* @__PURE__ */ new Set();
		this.isComponentMounted = false;
		this.previousDeps = null;
		this.instanceId = "";
		this.options = options;
		this.subscriptions = /* @__PURE__ */ new Set();
		this.setEditor(this.getInitialEditor());
		this.scheduleDestroy();
		this.getEditor = this.getEditor.bind(this);
		this.getServerSnapshot = this.getServerSnapshot.bind(this);
		this.subscribe = this.subscribe.bind(this);
		this.refreshEditorInstance = this.refreshEditorInstance.bind(this);
		this.scheduleDestroy = this.scheduleDestroy.bind(this);
		this.onRender = this.onRender.bind(this);
		this.createEditor = this.createEditor.bind(this);
	}
	setEditor(editor) {
		this.editor = editor;
		this.instanceId = Math.random().toString(36).slice(2, 9);
		this.subscriptions.forEach((cb) => cb());
	}
	getInitialEditor() {
		const explicit = this.options.current.immediatelyRender;
		let immediatelyRender = explicit !== null && explicit !== void 0 ? explicit : true;
		if (isSSR) immediatelyRender = false;
		else if (isNext && explicit === void 0) immediatelyRender = false;
		return immediatelyRender ? this.createEditor() : null;
	}
	/**
	* Create a new editor instance. And attach event listeners.
	*/
	createEditor() {
		const optionsToApply = {
			...this.options.current,
			onBeforeCreate: (...args) => {
				var _this$options$current, _this$options$current2;
				return (_this$options$current = (_this$options$current2 = this.options.current).onBeforeCreate) === null || _this$options$current === void 0 ? void 0 : _this$options$current.call(_this$options$current2, ...args);
			},
			onBlur: (...args) => {
				var _this$options$current3, _this$options$current4;
				return (_this$options$current3 = (_this$options$current4 = this.options.current).onBlur) === null || _this$options$current3 === void 0 ? void 0 : _this$options$current3.call(_this$options$current4, ...args);
			},
			onCreate: (...args) => {
				var _this$options$current5, _this$options$current6;
				return (_this$options$current5 = (_this$options$current6 = this.options.current).onCreate) === null || _this$options$current5 === void 0 ? void 0 : _this$options$current5.call(_this$options$current6, ...args);
			},
			onDestroy: (...args) => {
				var _this$options$current7, _this$options$current8;
				return (_this$options$current7 = (_this$options$current8 = this.options.current).onDestroy) === null || _this$options$current7 === void 0 ? void 0 : _this$options$current7.call(_this$options$current8, ...args);
			},
			onFocus: (...args) => {
				var _this$options$current9, _this$options$current10;
				return (_this$options$current9 = (_this$options$current10 = this.options.current).onFocus) === null || _this$options$current9 === void 0 ? void 0 : _this$options$current9.call(_this$options$current10, ...args);
			},
			onSelectionUpdate: (...args) => {
				var _this$options$current11, _this$options$current12;
				return (_this$options$current11 = (_this$options$current12 = this.options.current).onSelectionUpdate) === null || _this$options$current11 === void 0 ? void 0 : _this$options$current11.call(_this$options$current12, ...args);
			},
			onTransaction: (...args) => {
				var _this$options$current13, _this$options$current14;
				return (_this$options$current13 = (_this$options$current14 = this.options.current).onTransaction) === null || _this$options$current13 === void 0 ? void 0 : _this$options$current13.call(_this$options$current14, ...args);
			},
			onUpdate: (...args) => {
				var _this$options$current15, _this$options$current16;
				return (_this$options$current15 = (_this$options$current16 = this.options.current).onUpdate) === null || _this$options$current15 === void 0 ? void 0 : _this$options$current15.call(_this$options$current16, ...args);
			},
			onContentError: (...args) => {
				var _this$options$current17, _this$options$current18;
				return (_this$options$current17 = (_this$options$current18 = this.options.current).onContentError) === null || _this$options$current17 === void 0 ? void 0 : _this$options$current17.call(_this$options$current18, ...args);
			},
			onDrop: (...args) => {
				var _this$options$current19, _this$options$current20;
				return (_this$options$current19 = (_this$options$current20 = this.options.current).onDrop) === null || _this$options$current19 === void 0 ? void 0 : _this$options$current19.call(_this$options$current20, ...args);
			},
			onPaste: (...args) => {
				var _this$options$current21, _this$options$current22;
				return (_this$options$current21 = (_this$options$current22 = this.options.current).onPaste) === null || _this$options$current21 === void 0 ? void 0 : _this$options$current21.call(_this$options$current22, ...args);
			},
			onDelete: (...args) => {
				var _this$options$current23, _this$options$current24;
				return (_this$options$current23 = (_this$options$current24 = this.options.current).onDelete) === null || _this$options$current23 === void 0 ? void 0 : _this$options$current23.call(_this$options$current24, ...args);
			},
			onMount: (...args) => {
				var _this$options$current25, _this$options$current26;
				return (_this$options$current25 = (_this$options$current26 = this.options.current).onMount) === null || _this$options$current25 === void 0 ? void 0 : _this$options$current25.call(_this$options$current26, ...args);
			},
			onUnmount: (...args) => {
				var _this$options$current27, _this$options$current28;
				return (_this$options$current27 = (_this$options$current28 = this.options.current).onUnmount) === null || _this$options$current27 === void 0 ? void 0 : _this$options$current27.call(_this$options$current28, ...args);
			}
		};
		return new Editor(optionsToApply);
	}
	/**
	* Get the current editor instance.
	*/
	getEditor() {
		return this.editor;
	}
	/**
	* Always disable the editor on the server-side.
	*/
	getServerSnapshot() {
		return null;
	}
	/**
	* Subscribe to the editor instance's changes.
	*/
	subscribe(onStoreChange) {
		this.subscriptions.add(onStoreChange);
		return () => {
			this.subscriptions.delete(onStoreChange);
		};
	}
	static compareOptions(a, b) {
		return Object.keys(a).every((key) => {
			if ([
				"onCreate",
				"onBeforeCreate",
				"onDestroy",
				"onUpdate",
				"onTransaction",
				"onFocus",
				"onBlur",
				"onSelectionUpdate",
				"onContentError",
				"onDrop",
				"onPaste"
			].includes(key)) return true;
			if (key === "extensions" && a.extensions && b.extensions) {
				if (a.extensions.length !== b.extensions.length) return false;
				return a.extensions.every((extension, index) => {
					var _b$extensions;
					if (extension !== ((_b$extensions = b.extensions) === null || _b$extensions === void 0 ? void 0 : _b$extensions[index])) return false;
					return true;
				});
			}
			if (a[key] !== b[key]) return false;
			return true;
		});
	}
	/**
	* On each render, we will create, update, or destroy the editor instance.
	* @param deps The dependencies to watch for changes
	* @returns A cleanup function
	*/
	onRender(deps) {
		return () => {
			this.isComponentMounted = true;
			clearTimeout(this.scheduledDestructionTimeout);
			if (this.editor && !this.editor.isDestroyed && deps.length === 0) {
				if (!EditorInstanceManager.compareOptions(this.options.current, this.editor.options)) this.editor.setOptions({
					...this.options.current,
					editable: this.editor.isEditable
				});
			} else this.refreshEditorInstance(deps);
			return () => {
				this.isComponentMounted = false;
				this.scheduleDestroy();
			};
		};
	}
	/**
	* Recreate the editor instance if the dependencies have changed.
	*/
	refreshEditorInstance(deps) {
		if (this.editor && !this.editor.isDestroyed) {
			if (this.previousDeps === null) {
				this.previousDeps = deps;
				return;
			}
			if (this.previousDeps.length === deps.length && this.previousDeps.every((dep, index) => dep === deps[index])) return;
		}
		if (this.editor && !this.editor.isDestroyed) this.editor.destroy();
		this.setEditor(this.createEditor());
		this.previousDeps = deps;
	}
	/**
	* Schedule the destruction of the editor instance.
	* This will only destroy the editor if it was not mounted on the next tick.
	* This is to avoid destroying the editor instance when it's actually still mounted.
	*/
	scheduleDestroy() {
		const currentInstanceId = this.instanceId;
		const currentEditor = this.editor;
		this.scheduledDestructionTimeout = setTimeout(() => {
			if (this.isComponentMounted && this.instanceId === currentInstanceId) {
				if (currentEditor) currentEditor.setOptions(this.options.current);
				return;
			}
			if (currentEditor && !currentEditor.isDestroyed) {
				currentEditor.destroy();
				if (this.instanceId === currentInstanceId) this.setEditor(null);
			}
		}, 1);
	}
};
function useEditor(options = {}, deps = []) {
	const mostRecentOptions = (0, import_react.useRef)(options);
	mostRecentOptions.current = options;
	const [instanceManager] = (0, import_react.useState)(() => new EditorInstanceManager(mostRecentOptions));
	const editor = (0, import_shim.useSyncExternalStore)(instanceManager.subscribe, instanceManager.getEditor, instanceManager.getServerSnapshot);
	(0, import_react.useDebugValue)(editor);
	(0, import_react.useEffect)(instanceManager.onRender(deps));
	useEditorState({
		editor,
		selector: ({ transactionNumber }) => {
			if (options.shouldRerenderOnTransaction === false || options.shouldRerenderOnTransaction === void 0) return null;
			if (options.immediatelyRender && transactionNumber === 0) return 0;
			return transactionNumber + 1;
		}
	});
	return editor;
}
var EditorContext = (0, import_react.createContext)({ editor: null });
EditorContext.Consumer;
var ReactNodeViewContext = (0, import_react.createContext)({
	onDragStart: () => {},
	nodeViewContentChildren: void 0,
	nodeViewContentRef: () => {}
});
var useReactNodeView = () => (0, import_react.useContext)(ReactNodeViewContext);
import_react.forwardRef((props, ref) => {
	const { onDragStart } = useReactNodeView();
	const Tag = props.as || "div";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, {
		...props,
		ref,
		"data-node-view-wrapper": "",
		onDragStart,
		style: {
			whiteSpace: "normal",
			...props.style
		}
	});
});
import_react.createContext({ markViewContentRef: () => {} });
/**
* React context that stores the current editor instance.
*
* Use `useTiptap()` to read from this context in child components.
*/
var TiptapContext = (0, import_react.createContext)({ get editor() {
	throw new Error("useTiptap must be used within a <Tiptap> provider");
} });
TiptapContext.displayName = "TiptapContext";
/**
* Hook to read the Tiptap context and access the editor instance.
*
* This is a small convenience wrapper around `useContext(TiptapContext)`.
* The editor is always available when used within a `<Tiptap>` provider.
*
* @returns The current `TiptapContextType` value from the provider.
*
* @example
* ```tsx
* import { useTiptap } from '@tiptap/react'
*
* function Toolbar() {
*   const { editor } = useTiptap()
*
*   return (
*     <button onClick={() => editor.chain().focus().toggleBold().run()}>
*       Bold
*     </button>
*   )
* }
* ```
*/
var useTiptap = () => (0, import_react.useContext)(TiptapContext);
/**
* Top-level provider component that makes the editor instance available via
* React context to all child components.
*
* This component also provides backwards compatibility with the legacy
* `EditorContext`, so components using `useCurrentEditor()` will work
* inside a `<Tiptap>` provider.
*
* @param props - Component props.
* @returns A context provider element wrapping `children`.
*
* @example
* ```tsx
* import { Tiptap, useEditor } from '@tiptap/react'
*
* function App() {
*   const editor = useEditor({ extensions: [...] })
*
*   return (
*     <Tiptap editor={editor}>
*       <Toolbar />
*       <Tiptap.Content />
*     </Tiptap>
*   )
* }
* ```
*/
function TiptapWrapper({ children, ...props }) {
	const resolvedEditor = "editor" in props ? props.editor : props.instance;
	if (!resolvedEditor) throw new Error("Tiptap: An editor instance is required. Pass a non-null `editor` prop.");
	const tiptapContextValue = (0, import_react.useMemo)(() => ({ editor: resolvedEditor }), [resolvedEditor]);
	const legacyContextValue = (0, import_react.useMemo)(() => ({ editor: resolvedEditor }), [resolvedEditor]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorContext.Provider, {
		value: legacyContextValue,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TiptapContext.Provider, {
			value: tiptapContextValue,
			children
		})
	});
}
TiptapWrapper.displayName = "Tiptap";
/**
* Convenience component that renders `EditorContent` using the context-provided
* editor instance. Use this instead of manually passing the `editor` prop.
*
* @param props - All `EditorContent` props except `editor` and `ref`.
* @returns An `EditorContent` element bound to the context editor.
*
* @example
* ```tsx
* // inside a Tiptap provider
* <Tiptap.Content className="editor" />
* ```
*/
function TiptapContent({ ...rest }) {
	const { editor } = useTiptap();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorContent, {
		editor,
		...rest
	});
}
TiptapContent.displayName = "Tiptap.Content";
Object.assign(TiptapWrapper, { 
/**
* The Tiptap Content component that renders the EditorContent with the editor instance from the context.
* @see TiptapContent
*/
Content: TiptapContent });
//#endregion
export { useEditor as n, useEditorState as r, EditorContent as t };
