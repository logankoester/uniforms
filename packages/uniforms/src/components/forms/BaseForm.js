import React       from 'react';
import cloneDeep   from 'lodash.clonedeep';
import get         from 'lodash.get';
import set         from 'lodash.set';
import {Component} from 'react';
import {PropTypes} from 'react';

import changedKeys        from '../../helpers/changedKeys';
import createSchemaBridge from '../../bridges';
import randomIds          from '../../helpers/randomIds';

// Silent `Uncaught (in promise)` warnings
// TODO: Find a better way to do it
/* eslint-disable */
let   unhandledPromiseHandlerCount   = 0;
const unhandledPromiseHandlerAllowed = typeof window !== 'undefined';
const unhandledPromiseHandler = event =>
    event &&
    event.reason &&
    event.reason.__uniformsPromiseMark &&
    event.preventDefault()
;

const unhandledPromiseHandlerAdd = () => unhandledPromiseHandlerAllowed && ++unhandledPromiseHandlerCount === 1 && window.   addEventListener('unhandledrejection', unhandledPromiseHandler);
const unhandledPromiseHandlerDel = () => unhandledPromiseHandlerAllowed && --unhandledPromiseHandlerCount === 0 && window.removeEventListener('unhandledrejection', unhandledPromiseHandler);
/* eslint-enable */

export default class BaseForm extends Component {
    static displayName = 'Form';

    static defaultProps = {
        model: {},
        label: true,

        autosave: false,
        autosaveDelay: 0,

        noValidate: true
    };

    static propTypes = {
        error:  PropTypes.object,
        model:  PropTypes.object,
        schema: PropTypes.any.isRequired,

        onChange:        PropTypes.func,
        onSubmit:        PropTypes.func,
        onSubmitFailure: PropTypes.func,
        onSubmitSuccess: PropTypes.func,

        label:       PropTypes.bool,
        disabled:    PropTypes.bool,
        placeholder: PropTypes.bool,

        autosave:      PropTypes.bool,
        autosaveDelay: PropTypes.number
    };

    static childContextTypes = {
        uniforms: PropTypes.shape({
            name: PropTypes.arrayOf(PropTypes.string).isRequired,

            error: PropTypes.object,
            model: PropTypes.object.isRequired,

            schema: PropTypes.shape({
                getError:         PropTypes.func.isRequired,
                getErrorMessage:  PropTypes.func.isRequired,
                getErrorMessages: PropTypes.func.isRequired,
                getField:         PropTypes.func.isRequired,
                getInitialValue:  PropTypes.func.isRequired,
                getProps:         PropTypes.func.isRequired,
                getSubfields:     PropTypes.func.isRequired,
                getType:          PropTypes.func.isRequired,
                getValidator:     PropTypes.func.isRequired
            }).isRequired,

            state: PropTypes.shape({
                changed:    PropTypes.bool.isRequired,
                changedMap: PropTypes.object.isRequired,

                label:       PropTypes.bool.isRequired,
                disabled:    PropTypes.bool.isRequired,
                placeholder: PropTypes.bool.isRequired
            }).isRequired,

            onChange: PropTypes.func.isRequired,
            randomId: PropTypes.func.isRequired
        }).isRequired
    };

    constructor () {
        super(...arguments);

        this.state = {
            bridge: createSchemaBridge(this.props.schema),

            changed: null,
            changedMap: {},

            resetCount: 0
        };

        this.delayId  = null;
        this.randomId = randomIds(this.props.id);

        this.onReset  = this.reset  = this.onReset.bind(this);
        this.onChange = this.change = this.onChange.bind(this);
        this.onSubmit = this.submit = this.onSubmit.bind(this);

        this.getModel           = this.getModel.bind(this);
        this.getChangedKeys     = this.getChangedKeys.bind(this);
        this.getNativeFormProps = this.getNativeFormProps.bind(this);

        this.getChildContextName     = this.getChildContextName.bind(this);
        this.getChildContextError    = this.getChildContextError.bind(this);
        this.getChildContextModel    = this.getChildContextModel.bind(this);
        this.getChildContextState    = this.getChildContextState.bind(this);
        this.getChildContextSchema   = this.getChildContextSchema.bind(this);
        this.getChildContextOnChange = this.getChildContextOnChange.bind(this);
    }

    getChildContext () {
        return {
            uniforms: {
                name:     this.getChildContextName(),
                error:    this.getChildContextError(),
                model:    this.getChildContextModel(),
                state:    this.getChildContextState(),
                schema:   this.getChildContextSchema(),
                onChange: this.getChildContextOnChange(),
                randomId: this.randomId
            }
        };
    }

    getChildContextName () {
        return [];
    }

    getChildContextError () {
        return this.props.error;
    }

    getChildContextModel () {
        return this.props.model;
    }

    getChildContextState () {
        return {
            changed:  !!this.state.changed,
            changedMap: this.state.changedMap,

            label:       !!this.props.label,
            disabled:    !!this.props.disabled,
            placeholder: !!this.props.placeholder
        };
    }

    getChildContextSchema () {
        return this.state.bridge;
    }

    getChildContextOnChange () {
        return this.onChange;
    }

    getModel () {
        return this.getChildContextModel();
    }

    componentWillMount () {
        this.setState({}, () => this.setState({changed: false}));
    }

    componentDidMount () {
        unhandledPromiseHandlerAdd();
    }

    componentWillUnmount () {
        unhandledPromiseHandlerDel();
    }

    componentWillReceiveProps ({schema}) {
        if (this.props.schema !== schema) {
            this.setState({bridge: createSchemaBridge(schema)});
        }
    }

    render () {
        return (
            <form {...this.getNativeFormProps()} />
        );
    }

    getChangedKeys (root, valueA, valueB) {
        return changedKeys(root, valueA, valueB);
    }

    getNativeFormProps () {
        const {
            autosave,        // eslint-disable-line no-unused-vars
            autosaveDelay,   // eslint-disable-line no-unused-vars
            disabled,        // eslint-disable-line no-unused-vars
            error,           // eslint-disable-line no-unused-vars
            label,           // eslint-disable-line no-unused-vars
            model,           // eslint-disable-line no-unused-vars
            onChange,        // eslint-disable-line no-unused-vars
            onSubmit,        // eslint-disable-line no-unused-vars
            onSubmitFailure, // eslint-disable-line no-unused-vars
            onSubmitSuccess, // eslint-disable-line no-unused-vars
            placeholder,     // eslint-disable-line no-unused-vars
            schema,          // eslint-disable-line no-unused-vars

            ...props
        } = this.props;

        return {
            ...props,

            onSubmit: this.onSubmit,

            key: `reset-${this.state.resetCount}`
        };
    }

    onChange (key, value) {
        // Do not set `changed` before componentDidMount
        if (this.state.changed !== null) {
            this.setState({changed: true});
            this.getChangedKeys(key, value, get(this.getModel(), key)).forEach(key =>
                this.setState(state => get(state.changedMap, key)
                    ? {}
                    : {changedMap: set(cloneDeep(state.changedMap), key, {})}
                )
            );
        }

        if (this.props.onChange) {
            this.props.onChange(key, value);
        }

        // Do not call `onSubmit` before componentDidMount
        if (this.state.changed !== null && this.props.autosave) {
            if (this.delayId) {
                this.delayId = clearTimeout(this.delayId);
            }

            if (this.props.autosaveDelay > 0) {
                this.delayId = setTimeout(this.onSubmit, this.props.autosaveDelay);
            } else {
                this.onSubmit();
            }
        }
    }

    onReset () {
        this.setState(state => ({changed: false, changedMap: {}, resetCount: state.resetCount + 1}));
    }

    onSubmit (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const promise = Promise.resolve(
            this.props.onSubmit &&
            this.props.onSubmit(this.getModel())
        );

        promise.then(
            this.props.onSubmitSuccess,
            this.props.onSubmitFailure
        );

        return promise;
    }
}
