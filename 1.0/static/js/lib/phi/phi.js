/**
 *
 * Phi Core - A multi-paradigm JavaScript library
 *
 *
 *
 * Copyright (c) 2010 Authors of PHI
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 *
 */

(function() {

	/**
	 *
	 * a static namespace for the library (phi)
	 *
	 */

	var phi = window.phi = {

		/**
		 *
		 * installs any object into the global public namespace under any given name
		 *
		 * @param name {String} the name to which the object is referenced too in the global namespace (i.e. window)
		 * @param object {Object} the object to reveal as a public member of the global namespace
		 *
		 */

		install: function(name, object) {
			if (window[name]) {
				return Error('The namespace ' + name + ' is already used.');
			} else {
				window[name] = object;
			}
		},


		/**
		 * unique ids for various purposes
		 * 
		 */

		uid: 1,
		getUID: function() {
			return this.uid ++;
		},

		/**
		 *
		 * extends objects with other objects
		 * 
		 */

		extend: function( target ) {
			var object;
			var l = arguments.length;
			for (var i = 1; i < l; i++) {
				object = arguments[i];
				for (var j in object) {
					if (typeof j === 'string') {
						target[j] = object[j];
					}
				}
			}
			return target;
		},
		
		/**
		 *
		 * gets the variables of a url
		 *
		 * @param url {String}		the url to get the variables from
		 *
		 */
		
		getVariables: function(url) {
			
			var url = url || window.location.toString();
			var hash = url.split('?');
			var vars = undefined;
			
			if (hash.length && hash[1]) {
				vars = {};
				var pairs = hash[1].split('&');
				var pair;
				for (var i = pairs.length - 1; i >= 0; i--) {
					pair = pairs[i].split('=');
					vars[pair[0]] = pair[1];
				};
			}
			
			return vars;
		}
		
	};
	
	/**
	 *
	 * binds a Function to execute in the scope of any object. 
	 *
	 * The 'this' keyword inside the Function references the preferred object.
	 * It is used in callback methods to prevent their scope defaulting to a global namespace such as 'window'.
	 *
	 * @param object {Object} the object to which the Function is bound
	 *
	 */

	Function.prototype.bind = function(object) {
		var b = this;
		return function() {
			return b.apply(object, arguments);
		};
	};

	/**
	 * Creates a callback for any function where some of its arguements may be prefilled. The 
	 * prefilled arguments always take precedence.
	 * 
	 */

	Function.prototype.partial = function() {
		var method = this;
		var defined = arguments;
		return function() {
			var l = Math.max(defined.length, arguments.length);
			var parameters = [];
			for (var i = 0; i < l; i++) {
				parameters[i] = defined[i] || arguments[i];
			}
			return method.apply(this, parameters);
		};
	};

	/**
	 *
	 * a constructor to define Classes using a definition object.
	 *
	 * @param definition {Object} the definition of the Class
	 *
	 */

	var Class = phi.Class = function( definition ) {

		var base, interfaces, aspects, init, statics;
		var proto = {};

		for (var i in definition) {
			if (typeof i === 'string') {
				switch (i) {
					case '_extends' :  
					base = definition[i];
					break;
					case '_implements' :
					interfaces = definition[i];
					break;
					case '_applies' : 
					aspects = definition[i];
					break;
					case '_init' :
					init = definition[i];
					break;
					case '_static' : 
					statics = definition[i];
					break;
					default : 
					proto[i] = definition[i];
					break;
				}
			}
		}

		/* Create a constructor.  */
		var child = this.extend(init, base);

		/* Create an instance of the base.  */
		if (base) {
			var p = base.prototype;
			base = function() {};
			base.prototype = p;
			child.prototype = new base();
			child.prototype.contructor = child;
		}

		/* Attach the methods as specified in the Class.  */
		if (proto) {
			this.implement(child.prototype, proto);
		}

		/* Checks for the methods of the interface.  */
		if (interfaces) {
			if (interfaces instanceof Array) {
				var l = interfaces.length;
				for (var f = 0; f < l; f++) {
					this.check(child.prototype, interfaces[f].prototype);
				}
			} else {
				this.check(child.prototype, interfaces.prototype);
			}
		}

		/* Check if the Class implements the methods in the Aspect and apply the before and after clauses to it.  */
		if (aspects) {
			if (aspects instanceof Array) {
				var s = aspects.length;
				for (var a = 0; a < s; a++) {
					this.check(child.prototype, aspects[a].prototype);
					this.applies(child.prototype, aspects[a].prototype);
				}
			} else {
				this.check(child.prototype, aspects.prototype);
				this.applies(child.prototype, aspects.prototype);
			}
		}

		if (statics) {
			this.implement(child, statics);
		}

		return child;
	};


	Class.prototype = {
		constructor: Class,

		/**
		 *
		 * extends the constructor of a Class with the constructor of the base
		 *
		 * @param a {Function} the constructor for the child Class
		 * @param b {Function} the constructor for the base Class
		 *
		 * @returns c {Function} the new constructor for the child Class
		 *
		 */

		extend: function(a, b) {
			var c = function() {
				if (b) { b.apply(this, arguments); }
				if (a) { a.apply(this, arguments); }
			};
			return c;
		},

		/**
		 *
		 * implements all the Functions in the prototype of the base Class in the prototype of the child Class
		 *
		 * @param a {Object} the prototype of the child Class
		 * @param b {Object} the prototype of the base Class
		 *
		 */

		implement: function(a, b) {
			for (var c in b) {
				if (typeof c === 'string') {
					a[c] = b[c];
				}
			}
		},


		/**
		 *
		 * checks if all required Functions are implemented in the child Class, if it implements an Interface
		 *
		 * @param prototype {Object} the prototype of the Child Class
		 * @param interface {Object} the interface provided in the Class definition
		 *
		 */

		check: function(a, b) {
			for (var c in b) {
				if (!a[c] || !(a[c] instanceof Function)) {
					throw Error(c + ' is not implemented or not a function.');
				}
			}
		},

		/**
		 *
		 * applies all the before and after clauses of an Aspect to the methods in the child Class
		 *
		 * @param prototype {Object} the prototype of the child Class
		 * @param aspect {Object} the Aspect to apply to the child Class
		 *
		 */

		applies: function(prototype, aspects) {
			var apply = function(method, before, after) {
				return function() {
					if (before){ before.apply(this, arguments); }
					var result = method.apply(this, arguments);
					if (after) { after.apply(this, arguments); }
					return result;
				};
			};

			for (var name in aspects) {
				if (typeof name === 'string' && prototype[name]) {
					var aspect = aspects[name];
					prototype[name] = apply(prototype[name], aspect.before, aspect.after);
				}
			}
		}
	};


	phi.install('Class', Class);

	/**
	 * 
	 * an abstract Interface of any Class.
	 * Programming to Interfaces allows the programmer to ensure objects of a Class implement the required Functions. 
	 *
	 * @constructor
	 *
	 * @param definition {Object} a definition consisting of a list of method names referencing undefined
	 *
	 * @returns interface {Interface} an interface object that can be implemented in a Class
	 *
	 */

	var Interface = phi.Interface = function(definition) {

		var base;
		var proto = {};
		var child = function() {};

		for (var i in definition) {
			if (typeof i === 'string') {
				if (i === '_extends') {
					base = definition[i];
				} else {
					proto[i] = definition[i];
				}
			}
		}

		/* instantiate the constructor as a new interface or function. */
		if (base) {
			child.prototype = new base();
		}

		/* apply the methods of the interface. */
		if (proto) {
			this.implement(child.prototype, proto);
		}

		return child;

	};

	Interface.prototype = {
		constructor: Interface,

		/**
		 *
		 * implements methods in the Interface definition in the prototype of the Interface
		 *
		 */

		implement: function(a, b) {
			for (var c in b) {
				if (typeof c === 'string') {
					if (!(b[c] instanceof Function)) {
						throw Error('Interfaces may only define functions.');
					}
					a[c] = b[c];
				}
			}
		}
	};

	phi.install('Interface', Interface);

	/**
	 *
	 * an abstract Aspect of of any Class.
	 * Use Aspects if you want to apply a before and/or after clause to the implementation of a Function in the child Class.
	 * Because an Aspect is abstract calling the constructor throws an Error. 
	 *
	 * @constructor
	 *
	 * @param definition {Object} the definition of the aspect
	 *
	 * @returns aspect {Aspect} the aspect
	 *
	 */

	var Aspect = phi.Aspect = function(definition) {

		/* create an abstract constructor for the aspect. */
		var b = function() { 
			throw Error(); 
		};

		/* add a before/after clause to the method in the Class. */
		this.implement(b.prototype, definition);
		
		/* return the aspect */
		return b;

	};

	Aspect.prototype = {
		constructor: Aspect,

		/**
		 *
		 * implements the Functions with before and after clauses to the prototype of the Aspect
		 *
		 * @param prototype {Object} the prototype of the Aspect
		 * @param aspect {Object} the definition of the Aspect
		 *
		 */

		implement: function(a, b) {
			for (var c in b) {
				if (typeof c === 'string') {
					a[c] = b[c];
				}
			}
		}
	};

	phi.install('Aspect', Aspect);


	/**
	 * Native JS 1.6 Array functions patch for IE 6 to 8
	 *
	 */

	var prototype = Array.prototype;

	if (!prototype.map){
		prototype.map = function(handler, scope){
			var result = [];
			var l = this.length;
			for (var i = 0; i < l; i++){
				if (i in this){
					result[i] = handler.call(scope, this[i], i, this);
				}
			}	
			return result;
		};
	}

	if (!prototype.forEach){
		prototype.forEach = function(handler, scope){
			var l = this.length;
			for (var i = 0; i < l; i++){
				if (i in this){
					handler.call(scope, this[i], i, this);
				}
			}
		};
	}

	if (!prototype.filter){
		prototype.filter = function(handler, scope){
			var result = [];
			var l = this.length;
			for (var i = 0; i < l; i++){
				if (i in this){
					var value = this[i];
					if (handler.call(scope, value, i, this)){
						result.push(value);
					}
				}
			}
			return result;
		};
	}

	if (!prototype.some){
		prototype.some = function(handler, scope){
			var l = this.length;
			for (var i = 0; i < l; i++){
				if (i in this && handler.call(scope, this[i], i, this)){
					return true;
				}
			}
			return false;
		};
	}

	if (!prototype.every){
		prototype.every = function(handler, scope){
			var l = this.length;
			for (var i = 0; i < l; i++){
				if (i in this && !handler.call(scope, this[i], i, this)){
					return false;
				}
			}
			return true;
		};
	}

	if (!prototype.indexOf){
		prototype.indexOf = function(item, from){
			var l = this.length;
			var start = from || 0;
			if (from < 0){ start = l - from; }
			for (var i = start; i < l; i++){
				if (i in this && this[i] === item){
					return i;
				}
			}
			return -1;
		};
	}

	if (!prototype.lastIndexOf){
		prototype.lastIndexOf = function(item, from){
			var l = this.length -1;
			var start = from || l;
			if (from < 0){ start = l - from; }
			for (var i = start; i >= 0; i--){
				if (i in this && this[i] === item){
					return i;
				}
			}
			return -1;
		};
	}

	/**
	 * check whether a node contains another one, currently only NOT supported by FF.
	 * 
	 */
	var Node = window.Node;
	if (Node && Node.prototype && !Node.prototype.contains){
		Node.prototype.contains = function(arg) {
			return !!(this.compareDocumentPosition(arg) & 16);
		};
	}

	/**
	 * Most basic map of maps
	 * 
	 */

	var Map = phi.Map = new Class({

		_init: function() {
			this.data = {};
		},

		set: function(property, value) {
			this.data[property] = value;
		},

		get: function(property) {
			return this.data[property];
		}

	});


	/**
	 * data storage on nodes, via uid related maps
	 * 
	 */

	var ATTR_UID = '_phi_uid';

	phi.data = {

		model: [],

		/**
		 * Sets a property in the data object of a node. Creates a data object if none is found.
		 * 
		 */

		set: function(node, property, value) {
			var map = this.getMap(node);
			if (!map) {
				map = this.setMap(node, new Map());
			}

			map.set(property, value);
		},

		/**
		 * gets the data object related to the given node, creates one if no data is found.
		 * 
		 */

		get: function(node, property) {
			var map = this.getMap(node);
			return map? map.get(property) : null;
		},

		/**
		 * returns the data map associated with the node
		 * 
		 */

		getMap: function(node) {
			var uid = parseInt(node[ATTR_UID], 10);
			return uid? this.model[uid] : null;
		},

		/**
		 * associates a data map with a node
		 * 
		 */

		setMap: function(node, map) {
			var uid = parseInt(node[ATTR_UID], 10);
			if (!uid) {
				uid = phi.getUID();
				node[ATTR_UID] = uid;
			}

			this.model[uid] = map;
			return map;
		}
	};

})();