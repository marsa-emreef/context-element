(function () {
    'use strict';

    const composeChangeEventName = (attribute) => `${attribute}Changed`;
    const hasValue = (param) => param !== undefined && param !== null && param !== '';
    const hasNoValue = (param) => !hasValue(param);
    const contains = (text, texts) => texts.reduce((acc, txt) => acc || text.indexOf(txt) >= 0, false);
    const DATA_WATCH_ATTRIBUTE = 'watch';
    const DATA_ACTION_ATTRIBUTE = 'action';
    const DATA_ASSET_ATTRIBUTE = 'asset';
    const DATA_KEY_ATTRIBUTE = 'data.key';
    const HIDE_CLASS = "data-element-hidden";
    const ARRAY_CONTEXT_ELEMENT_TAG_NAME = 'context-array';
    const CONTEXT_ELEMENT_TAG_NAME = 'context-element';
    const CHILD_ACTION_EVENT = 'childAction';
    const style = document.createElement('style');
    style.innerHTML = `.${HIDE_CLASS} {display: none !important;}`;
    document.head.appendChild(style);

    /**
     * Function to remove empty text node.
     */
    function noEmptyTextNode() {
        return (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                return /\S/.test(node.textContent);
            }
            return true;
        };
    }

    const ignoredAttributes = ['data', 'reducer'];
    /**
     * isValidAttribute return if there is active-attribute to be ignore by the ContextElement.
     * @param attributeName
     */
    function isValidAttribute(attributeName) {
        return ignoredAttributes.indexOf(attributeName) < 0;
    }

    /**
     * AttributeEvaluator is a class that stores information about node that have active-attributes.
     * The AttributeEvaluator is called by the DataRenderer object when DataRenderer.render is executed.
     *
     * AttributeEvaluator require the activeNode,dataGetter,updateDataCallback, and the reducer function from the DataRenderer.
     *
     * When the AttributeEvaluator initiated, the attribute evaluator will extract all the active-attributes from active-node and store them in
     * `activeAttributeValue`.
     *
     * Once the activeAttribute extracted from the node, AttributeEvaluator will remove those attributes from the node, remaining
     * only non-active attributes.
     *
     * The non active attributes then will be extracted from the node, and stored in the `defaultAttributeValue` property.
     *
     * The next step of the initialization process it to extract the active attributes and group them into 3 different map.
     * 1. stateAttributeProperty :  mapping of `data.property` group by first state then attribute.
     * 2. attributeStateProperty : mapping of `data.property` group by first attribute then state.
     * 3. eventStateAction : mapping of action group by first event then state.
     *
     * The last step of the initialization of AttributeEvaluator, is to bind the node against eventStateAction.
     */
    class AttributeEvaluator {
        /**
         * Constructor will perform initialization by constructing activeAttributeValue, defaultAttributeValue, eventStateAction,
         * stateAttributeProperty and attributeStateProperty.
         * The last process would be initialization of event listener.
         *
         * @param activeNode : node that contains active-attribute.
         * @param assetGetter : callback function to get the asset from context-data
         * @param dataGetter : callback function to return current data.
         * @param updateData : callback function to inform DataRenderer that a new data is created because of user action.
         * @param reducerGetter : function to map data into a new one because of user action.
         * @param activeAttributes : attributes that is used to lookup the nodes
         * @param bubbleChildAction
         */
        constructor(activeNode, assetGetter, dataGetter, updateData, reducerGetter, activeAttributes, bubbleChildAction) {
            // mapping for watch & assets
            this.attributeProperty = null;
            // mapping for action
            this.eventAction = null;
            /**
             * Render method will be invoked my DataRenderer.render. Render method will perform 2 major things,
             * update active-attribute `watch:updateAttributeWatch`  and `toggle:updateToggleAttribute`.
             */
            this.render = () => {
                const element = this.activeNode;
                const stateAttributeProperty = this.attributeProperty;
                const dataGetterValue = this.dataGetter();
                const data = dataGetterValue.data;
                const assetGetter = this.assetGetter;
                updateWatchAttribute(element, stateAttributeProperty, data, assetGetter);
            };
            this.activeNode = activeNode;
            this.dataGetter = dataGetter;
            this.assetGetter = assetGetter;
            this.updateData = updateData;
            this.bubbleChildAction = bubbleChildAction;
            this.reducerGetter = reducerGetter;
            this.activeAttributeValue = populateActiveAttributeValue(activeNode, activeAttributes);
            this.eventAction = mapEventStateAction(this.activeAttributeValue);
            this.attributeProperty = mapAttributeProperty(this.activeAttributeValue, [DATA_WATCH_ATTRIBUTE, DATA_ASSET_ATTRIBUTE]);
            initEventListener(activeNode, this.eventAction, dataGetter, updateData, reducerGetter, bubbleChildAction);
        }
    }
    /**
     * mapEventStateAction is a function to convert `action` active-attribute to action group by first event, then state.
     * @param attributeValue is an active attribute
     */
    const mapEventStateAction = (attributeValue) => {
        const eventStateAction = new Map();
        attributeValue.forEach((value, attributeName) => {
            if (attributeName.endsWith(DATA_ACTION_ATTRIBUTE)) {
                const attributes = attributeName.split('.');
                let event = '';
                if (attributes.length === 1) {
                    event = 'click';
                }
                else {
                    event = attributes[0];
                }
                eventStateAction.set(event, value);
            }
        });
        return eventStateAction;
    };
    /**
     * mapStateAttributeProperty is a function to convert `watch` active-attribute to property group by first state, then attribute.
     * @param attributeValue
     * @param attributePrefixes
     */
    const mapAttributeProperty = (attributeValue, attributePrefixes) => {
        const attributeProperty = new Map();
        attributeValue.forEach((value, attributeName) => {
            if (attributePrefixes.filter(attributePrefix => attributeName.endsWith(attributePrefix)).length > 0) {
                const attributes = attributeName.split('.');
                let attribute = '';
                let type = '';
                if (attributes.length === 1) {
                    attribute = 'content';
                    type = attributes[0];
                }
                else {
                    attribute = attributes[0];
                    type = attributes[1];
                }
                if (!attributeProperty.has(attribute)) {
                    attributeProperty.set(attribute, new Map());
                }
                attributeProperty.get(attribute).set(type, value);
            }
        });
        return attributeProperty;
    };
    /**
     * populateActiveAttributeValue will extract the active-attributes from the element.
     * @param element
     * @param activeAttributes
     */
    const populateActiveAttributeValue = (element, activeAttributes) => {
        const attributeValue = new Map();
        element.getAttributeNames().filter(name => contains(name, activeAttributes)).forEach(attributeName => {
            attributeValue.set(attributeName, element.getAttribute(attributeName));
            element.removeAttribute(attributeName);
        });
        return attributeValue;
    };
    /**
     * InitEventListener is the function to attach `toggle` active-attribute to HTMLElement.addEventListener.
     * This method requires htmlElement, eventStateAction, dataGetter, updateData and reducer.
     *
     * initEventListener will iterate over the eventStateAction map. Based on the event in eventStateAction, the function
     * will addEventListener to the element.
     *
     * When an event is triggered by the element, the eventListener callback will check event.type.
     * If the event.type is `submit` then the event will be prevented and propagation stopped.
     *
     * When element triggered an event, the current data.state will be verified against the eventStateAction.
     * If the current data.state is not available in the eventStateAction, then the event will be ignored.
     *
     * If the current data.state is available in the eventStateAction, or when GlobalState exist in the eventStateAction, then the
     * updateData callback will invoked to inform DataRenderer that user is triggering an action.
     *
     * @param element
     * @param eventStateAction
     * @param dataGetter
     * @param updateData
     * @param reducerGetter
     * @param bubbleChildAction
     */
    const initEventListener = (element, eventStateAction, dataGetter, updateData, reducerGetter, bubbleChildAction) => {
        eventStateAction.forEach((stateAction, event) => {
            event = event.startsWith('on') ? event.substring('on'.length, event.length) : event;
            element.addEventListener(event, (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                const dataGetterValue = dataGetter();
                const reducer = reducerGetter();
                const type = stateAction;
                let data = dataGetterValue.data;
                const action = { type, event };
                if ('key' in dataGetterValue) {
                    const arrayDataGetterValue = dataGetterValue;
                    data = arrayDataGetterValue.data;
                    action.data = data;
                    action.key = arrayDataGetterValue.key;
                    action.index = arrayDataGetterValue.index;
                }
                if (hasNoValue(reducer)) {
                    bubbleChildAction(action);
                }
                else {
                    updateData((oldData) => reducer(oldData, action));
                }
            });
        });
    };
    /**
     * Function to set property of an element, it will check if the attribute is a valid attribute, if its a valid attribute
     * then it will set the attribute value, and if the attribute is element property, then the element will be assigned for the attribute.
     *
     * @param attribute
     * @param element
     * @param val
     * @param data
     * @param property
     */
    function setPropertyValue(attribute, element, val, data, property) {
        if (isValidAttribute(attribute) && element.getAttribute(attribute) !== val) {
            element.setAttribute(attribute, val);
        }
        if (attribute in element) {
            element[attribute] = val;
            if (attribute === 'data') {
                element.dataPath = property;
            }
            const eventName = composeChangeEventName(attribute);
            element[eventName] = (val) => injectValue(data, property, val);
        }
        if (attribute === 'content') {
            element.innerHTML = val;
        }
    }
    /**
     * UpdateWatchAttribute is a method that will perform update against `watch` active-attribute.
     *
     * UpdateWatchAttribute will get the current attributeProps from stateAttributeProps based on the data.state.
     * It will iterate over the attribute from the attributeProps.
     * On each attribute iteration, the method will set the element.attribute based on the value of data[property].
     *
     * If the attribute is also a valid element.property, it will set the value of element.property against the
     * data[property] value either.
     *
     * If the attribute value is `content`,  the element.innerHTML value will be set against the data[property] value.
     *
     * @param element : node or also an HTMLElement
     * @param stateAttributeProperty : object that store the mapping of property against state and attribute.
     * @param data : current value of the data.
     * @param dataState : state value of the object.
     * @param assetGetter : callback to get the asset of the context element.
     */
    const updateWatchAttribute = (element, stateAttributeProperty, data, assetGetter) => {
        const attributeProps = stateAttributeProperty;
        if (hasNoValue(attributeProps)) {
            return;
        }
        attributeProps.forEach((typeProperty, attribute) => {
            const watchProperty = typeProperty.get(DATA_WATCH_ATTRIBUTE);
            const assetProperty = typeProperty.get(DATA_ASSET_ATTRIBUTE);
            let val = null;
            if (hasValue(watchProperty)) {
                val = extractValue(data, watchProperty);
            }
            else if (hasValue(assetProperty)) {
                val = assetGetter(assetProperty);
            }
            setPropertyValue(attribute, element, val, data, watchProperty);
        });
    };
    /**
     * Function to extract the value of json from jsonPath
     * @param data
     * @param prop
     */
    const extractValue = (data, prop) => {
        if (hasNoValue(data)) {
            return data;
        }
        try {
            const evaluate = new Function('data', `return data.${prop};`);
            return evaluate.call(null, data);
        }
        catch (err) {
            console.warn(data, err.message);
        }
        return null;
    };
    /**
     * Function to extract the value of json from jsonPath
     * @param data
     * @param prop
     * @param value
     *
     */
    const injectValue = (data, prop, value) => {
        if (hasNoValue(data)) {
            return;
        }
        try {
            const evaluate = new Function('data', 'value', `data.${prop} = value;`);
            return evaluate.call(null, data, value);
        }
        catch (err) {
            console.warn(err.message);
        }
    };

    /**
     * DataRenderer is an object that store cloned ContextElement.template and store it in 'nodes' property.
     * During initialization, DataRenderer scanned for the active-nodes against nodes property.
     * active-nodes are the node that contain active-attributes such as `watch|toggle|action`.
     *
     * When the active nodes identified, DataRenderer create AttributeEvaluator against each active-node, and store them in
     * attributeEvaluators property.
     *
     * When DataRenderer.render invoked by the ContextElement, DataRenderer iterate all ActiveAttributes and call
     * ActiveAttribute.render method.
     */
    class DataRenderer {
        /**
         * Constructor to setup the DataRenderer initialization.
         *
         * @param nodes is a cloned of ContextElement.template
         * @param assetGetter
         * @param updateData
         * @param reducerGetter
         * @param bubbleChildAction
         * @param updateDataFromChild
         */
        constructor(nodes, assetGetter, updateData, reducerGetter, bubbleChildAction, updateDataFromChild) {
            /**
             * Render with iterate all the AttributeEvaluators and call the AttributeEvaluator.render
             * @param getter
             */
            this.render = (getter) => {
                this.dataGetter = getter;
                this.attributeEvaluators.forEach((attributeEvaluator) => attributeEvaluator.render());
            };
            this.nodes = nodes;
            this.addChildActionEventListener(updateDataFromChild);
            const activeAttributes = [DATA_WATCH_ATTRIBUTE, DATA_ACTION_ATTRIBUTE, DATA_ASSET_ATTRIBUTE];
            const activeNodes = Array.from(activeNodesLookup(activeAttributes, nodes));
            const dataGetter = () => this.dataGetter();
            this.attributeEvaluators = activeNodes.map(activeNode => new AttributeEvaluator(activeNode, assetGetter, dataGetter, updateData, reducerGetter, activeAttributes, bubbleChildAction));
        }
        addChildActionEventListener(updateDataFromChild) {
            this.nodes.forEach((node) => {
                node.addEventListener(CHILD_ACTION_EVENT, (event) => {
                    if (event.defaultPrevented) {
                        return;
                    }
                    event.stopImmediatePropagation();
                    event.stopPropagation();
                    event.preventDefault();
                    const childAction = event.detail;
                    const currentData = this.dataGetter();
                    const currentAction = {
                        index: currentData.index,
                        event: childAction.event,
                        type: childAction.type,
                        data: currentData.data,
                        key: currentData.key
                    };
                    updateDataFromChild(childAction, currentAction);
                });
            });
        }
    }
    /**
     * activeNodesLookup will return nodes which has the `active-attributes`. Active attributes are the node attribute that contains attributesSuffix.
     * Example of active-attributes value.watch .
     * <pre>
     *     <code>
     *         <form submit.action="ADD_DATA">
     *              <input value.watch="name" >
     *         </form>
     *     </code>
     * </pre>
     * @param attributesSuffix watch|toggle|action
     * @param nodes filter
     */
    const activeNodesLookup = (attributesSuffix, nodes) => {
        return nodes.filter(noEmptyTextNode()).reduce((accumulator, node) => {
            if (!(node instanceof HTMLElement)) {
                return accumulator;
            }
            const element = node;
            const attributeNames = element.getAttributeNames();
            for (const attribute of attributeNames) {
                if (contains(attribute, attributesSuffix)) {
                    accumulator.add(element);
                }
            }
            if (!contains(element.tagName, [ARRAY_CONTEXT_ELEMENT_TAG_NAME.toUpperCase(), CONTEXT_ELEMENT_TAG_NAME.toUpperCase()])) {
                const childrenNodes = activeNodesLookup(attributesSuffix, Array.from(element.childNodes));
                Array.from(childrenNodes).forEach(childNode => accumulator.add(childNode));
            }
            return accumulator;
        }, new Set());
    };

    /**
     * ContextElement is HTMLElement which can render data in accordance with the template defined in it.
     * The following is an example of how we display the template page.
     *
     * <pre>
     *     <code>
     *         <context-element id="my-element">
     *             <div watch="name"></div>
     *             <div watch="city"></div>
     *             <div watch="email"></div>
     *         </context-element>
     *         <script>
     *             const contextElement = document.getElementById('my-element');
     *             contextElement.data = {name:"Javascript",city:"Tokyo",email:"javascript@contextelement.com};
     *         </script>
     *     </code>
     * </pre>
     *
     * ContextElement will populate the data into template by looking at the attribute which has watch keyword in it.
     * These attribute which has keyword `watch` in it are also known as active-attribute.
     * There are 4 kinds of active-attribute,  (watch / toggle / action / assets). each attribute works with a different mechanism when ContextElement renders the data.
     *
     */
    class ContextElement extends HTMLElement {
        /**
         * Constructor sets default value of reducer to return the parameter immediately (param) => param.
         */
        constructor() {
            super();
            /**
             * Callback function to set the data,
             * <pre>
             *     <code>
             *         contextElement.setData(data => ({...data,attribute:newValue});
             *     </code>
             * </pre>
             *
             * @param context
             */
            this.setData = (context) => {
                this.contextData = context(this.contextData);
                this.render();
            };
            /**
             * onMounted is invoke when the Element is ready and mounted to the window.document.
             * <pre>
             *     <code>
             *         contextElement.onMounted(() => console.log(`ChildNodes Ready `,contextElement.childNodes.length > 0));
             *     </code>
             * </pre>
             * @param onMountedListener
             */
            this.onMounted = (onMountedListener) => {
                this.onMountedCallback = onMountedListener;
            };
            /**
             * Get the assets from the current assets or the parent context element assets.
             * @param key
             */
            this.getAsset = (key) => {
                const assets = this.assets;
                if (hasValue(assets) && key in assets) {
                    return assets[key];
                }
                const superContextElement = this.superContextElement;
                if (hasValue(superContextElement)) {
                    return superContextElement.getAsset(key);
                }
                return null;
            };
            /**
             * Convert action to ActionPath
             * @param arrayAction
             */
            this.actionToPath = (arrayAction) => {
                const actionPath = { path: this.dataPath };
                if (hasValue(arrayAction.key)) {
                    actionPath.key = arrayAction.key;
                    actionPath.index = arrayAction.index;
                    actionPath.data = arrayAction.data;
                }
                return actionPath;
            };
            /**
             * updateDataCallback is a callback function that will set the data and call `dataChanged` method.
             * <pre>
             *     <code>
             *         contextElement.dataChanged = (data) => console.log("data changed");
             *     </code>
             * </pre>
             * @param dataSetter
             */
            this.updateDataCallback = (dataSetter) => {
                this.setData(dataSetter);
                const dataChangedEvent = composeChangeEventName('data');
                if (dataChangedEvent in this) {
                    this[dataChangedEvent].call(this, this.contextData);
                }
            };
            /**
             * To bubble child action to the parent.
             * @param action
             */
            this.bubbleChildAction = (action) => {
                const childAction = {
                    event: action.event,
                    type: action.type,
                    childActions: [this.actionToPath(action)]
                };
                this.dispatchDetailEvent(childAction);
            };
            /**
             * Updating current data from child action
             * @param action
             * @param currentAction
             */
            this.updateDataFromChild = (action, currentAction) => {
                const reducer = this.reducer;
                if (hasNoValue(reducer)) {
                    action.childActions = [this.actionToPath(currentAction), ...action.childActions];
                    this.dispatchDetailEvent(action);
                }
                else {
                    this.updateDataCallback((oldData) => {
                        return reducer(oldData, action);
                    });
                }
            };
            /**
             * render method is invoked by the component when it received a new data-update.
             * First it will create DataRenderer object if its not exist.
             * DataRenderer require ContextElement cloned template , updateDataCallback, and reducer.
             *
             * `cloned template` will be used by the DataRenderer as the real node that will be attached to document body.
             * `updateDataCallback` will be used by the DataRenderer to inform the ContextElement if there's new data-update performed by user action.
             * `reducer` is an function that will return a new copy of the data.Reducer is invoked when there's user action/
             *
             * Each time render method is invoked, a new callback to get the latest data (dataGetter) is created and passed to
             * DataRenderer render method.
             *
             */
            this.render = () => {
                if (hasNoValue(this.contextData) || hasNoValue(this.template)) {
                    return;
                }
                if (hasNoValue(this.renderer)) {
                    const dataNodes = this.template.map(node => node.cloneNode(true));
                    this.renderer = new DataRenderer(dataNodes, this.getAsset, this.updateDataCallback, () => this.reducer, this.bubbleChildAction, this.updateDataFromChild);
                }
                const reversedNodes = [...this.renderer.nodes].reverse();
                let anchorNode = document.createElement('template');
                this.append(anchorNode);
                for (const node of reversedNodes) {
                    if (anchorNode.previousSibling !== node) {
                        this.insertBefore(node, anchorNode);
                    }
                    anchorNode = node;
                }
                const data = this.contextData;
                const dataGetter = () => ({ data });
                this.renderer.render(dataGetter);
                this.lastChild.remove();
            };
            /**
             * initAttribute is the method to initialize ContextElement attribute invoked each time connectedCallback is called.
             */
            this.initAttribute = () => {
            };
            /**
             * Dispatch child action event.
             * @param childAction
             */
            this.dispatchDetailEvent = (childAction) => {
                const event = new CustomEvent(CHILD_ACTION_EVENT, { detail: childAction, cancelable: true, bubbles: true });
                this.dispatchEvent(event);
            };
            /**
             * Populate the ContextElement template by storing the node child-nodes into template property.
             * Once the child nodes is stored in template property, ContextElement will clear its content by calling this.innerHTML = ''
             */
            this.populateTemplate = () => {
                this.template = Array.from(this.childNodes).filter(noEmptyTextNode());
                this.innerHTML = ''; // we cleanup the innerHTML
            };
            /**
             * Get the super context element, this function will lookup to the parentNode which is instanceof ContextElement,
             * If the parent node is instance of contextElement then this node will return it.
             *
             * @param parentNode
             */
            this.getSuperContextElement = (parentNode) => {
                if (parentNode instanceof ContextElement) {
                    return parentNode;
                }
                else if (hasValue(parentNode.parentNode)) {
                    return this.getSuperContextElement(parentNode.parentNode);
                }
                return null;
            };
            this.template = null;
            this.renderer = null;
            this.reducer = null;
            this.contextData = {};
            this.assets = {};
        }
        /**
         * Get the value of data in this ContextElement
         */
        get data() {
            return this.contextData;
        }
        /**
         * Set the value of ContextElement data
         * @param value
         */
        set data(value) {
            this.setData(() => value);
        }
        // noinspection JSUnusedGlobalSymbols
        /**
         * connectedCallback is invoked each time the custom element is appended into a document-connected element.
         * When connectedCallback invoked, it will initialize the active attribute, populate the template, and call
         * onMountedCallback. Populating the template will be invoke one time only, the next call of connectedCallback will not
         * repopulate the template again.
         */
        connectedCallback() {
            this.superContextElement = this.getSuperContextElement(this.parentNode);
            this.initAttribute();
            if (hasNoValue(this.template)) {
                this.classList.add(HIDE_CLASS);
                const requestAnimationFrameCallback = () => {
                    this.populateTemplate();
                    this.classList.remove(HIDE_CLASS);
                    this.render();
                    if (hasValue(this.onMountedCallback)) {
                        this.onMountedCallback();
                        this.onMountedCallback = null;
                    }
                };
                //requestAnimationFrame(requestAnimationFrameCallback);
                setTimeout(requestAnimationFrameCallback, 0);
            }
        }
        // noinspection JSUnusedGlobalSymbols
        /**
         * Invoked each time the custom element is disconnected from the document's DOM.
         */
        disconnectedCallback() {
            this.superContextElement = null;
        }
    }

    /**
     * Error message to show when data.key is missing in context-array
     */
    const arrayContextElementMissingDataKey = () => `'<context-array>' requires 'data.key' attribute. data-key value should refer to the unique attribute of the data.`;

    /**
     * ArrayContextElement is ContextElement which can render array instead of javascript object.
     * The following is an example of how we display the context-array page.
     *
     * <pre>
     *     <code>
     *         <context-array id="my-element"  data.key="id">
     *             <div watch="name"></div>
     *             <div watch="city"></div>
     *             <div watch="email"></div>
     *         </context-array>
     *         <script>
     *             const contextElement = document.getElementById('my-element');
     *             contextElement.data = [
     *                  {name:"Javascript",city:"Tokyo",email:"javascript@contextelement.com,dataId:"1"},
     *                  {name:"Go",city:"Dubai",email:"go@contextelement.com,dataId:"2"},
     *                  {name:"Java",city:"Doha",email:"java@contextelement.com,dataId:"3"}
     *             ];
     *         </script>
     *     </code>
     * </pre>
     *
     */
    class ArrayContextElement extends ContextElement {
        /**
         * Set the default dataKeyPicker using callback that return value of object dataKeyField.
         */
        constructor() {
            super();
            /**
             * DataKeyPicker is a callback function to get the string key value of a data.
             *
             * @param dataKeyPicker
             */
            this.setDataKeyPicker = (dataKeyPicker) => {
                this.dataKeyPicker = dataKeyPicker;
            };
            /**
             * initAttribute store the data.key attribute value to dataKeyField property.
             */
            this.initAttribute = () => {
                this.dataKeyField = this.getAttribute(DATA_KEY_ATTRIBUTE);
            };
            /**
             * render method is invoked by the component when it received a new array-update.
             *
             * It will iterate the array and get the key value of the data.
             * It will create a DataRenderer if there is no dataRenderer exist.
             * The newly created DataRenderer then stored in the ContextElement renderers Map object along with the key.
             *
             * Each time ContexElement.render method is invoked, a new callback to get the latest data (dataGetter) is created and passed to
             * DataRenderer.render method.
             *
             */
            this.render = () => {
                const contextData = this.contextData;
                const template = this.template;
                const renderers = this.renderers;
                if (hasNoValue(contextData) || hasNoValue(template)) {
                    return;
                }
                this.removeExpiredData();
                let anchorNode = document.createElement('template');
                this.append(anchorNode);
                const dpLength = contextData.length - 1;
                [...contextData].reverse().forEach((data, index) => {
                    const dataKey = this.dataKeyPicker(data);
                    if (!renderers.has(dataKey)) {
                        const dataNode = template.map(node => node.cloneNode(true));
                        const itemRenderer = new DataRenderer(dataNode, this.getAsset, this.updateDataCallback, () => this.reducer, this.bubbleChildAction, this.updateDataFromChild);
                        renderers.set(dataKey, itemRenderer);
                    }
                    const itemRenderer = renderers.get(dataKey);
                    const reversedNodes = [...itemRenderer.nodes].reverse();
                    for (const node of reversedNodes) {
                        if (anchorNode.previousSibling !== node) {
                            this.insertBefore(node, anchorNode);
                        }
                        anchorNode = node;
                    }
                    const dataGetter = () => ({ data, key: dataKey, index: (dpLength - index) });
                    itemRenderer.render(dataGetter);
                });
                this.lastChild.remove();
            };
            /**
             * Function to remove keys that is no longer exist in the ContextElement.renderers.
             * When ContextElement received new data (dataSource),it will check the obsolete keys in the ContextElement.renderers.
             * The obsolate keys along with the DataRenderer attach to it, removed from the ContextElement.renderers, and the template
             * node removed from the document.body.
             */
            this.removeExpiredData = () => {
                const renderers = this.renderers;
                const contextData = this.contextData;
                const dataSourceKeys = contextData.map(data => this.dataKeyPicker(data));
                const prevKeys = Array.from(renderers.keys());
                const discardedKeys = prevKeys.filter(key => dataSourceKeys.indexOf(key) < 0);
                discardedKeys.forEach(discardedKey => {
                    const discardNode = (node) => node.remove();
                    renderers.get(discardedKey).nodes.forEach(discardNode);
                    renderers.delete(discardedKey);
                });
            };
            const defaultDataKeyPicker = (data) => {
                if (hasNoValue(this.dataKeyField)) {
                    throw new Error(arrayContextElementMissingDataKey());
                }
                return data[this.dataKeyField];
            };
            this.renderers = new Map();
            this.dataKeyPicker = defaultDataKeyPicker;
            this.contextData = [];
        }
        // noinspection JSUnusedGlobalSymbols
        /**
         * Observed attributes in context element
         */
        static get observedAttributes() {
            return [DATA_KEY_ATTRIBUTE];
        }
        // noinspection JSUnusedGlobalSymbols
        /**
         * update the dataKeyField if there's a new change in the attribute.
         *
         * @param name of the attribute
         * @param oldValue
         * @param newValue
         */
        attributeChangedCallback(name, oldValue, newValue) {
            if (name === DATA_KEY_ATTRIBUTE) {
                this.dataKeyField = newValue;
            }
        }
    }

    customElements.define(ARRAY_CONTEXT_ELEMENT_TAG_NAME, ArrayContextElement);
    customElements.define(CONTEXT_ELEMENT_TAG_NAME, ContextElement);

}());
