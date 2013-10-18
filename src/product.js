'use strict';


var currency = require('./util/currency'),
	Pubsub = require('./util/pubsub'),
	mixin = require('./util/mixin');


var parser = {
	quantity: function (value) {
		value = parseInt(value, 10);

		if (isNaN(value) || !value) {
			value = 1;
		}

		return value;
	},
	amount: function (value) {
		return parseFloat(value) || 0;
	}
};


function Product(data) {
	data.quantity = parser.quantity(data.quantity);
	data.amount = parser.amount(data.amount);
	data.href = data.href || (typeof window !== 'undefined') ? window.location.href : null,

    this._data = data;
	this._options = null;
	this._amount = null;
	this._total = null;

	Pubsub.call(this);
}


mixin(Product.prototype, Pubsub.prototype);


Product.prototype.get = function get(key) {
    return this._data[key];
};


Product.prototype.set = function set(key, value) {
	var setter = parser[key];

	this._data[key] = setter ? setter(value) : value;
	this._options = null;
	this._amount = null;
	this._total = null;

    this.fire('change', key);
};


Product.prototype.options = function options() {
	var result, key, value, amount, i, j;

	if (!this._options) {
		result = [];
		i = 0;

		while ((key = this.get('on' + i))) {
			value = this.get('os' + i);
			amount = 0;
			j = 0;

			while (typeof this.get('option_select' + j) !== 'undefined') {
				if (this.get('option_select' + j) === value) {
					amount = parser.amount(this.get('option_amount' + j));
					break;
				}

				j++;
			}

			result.push({
				key: key,
				value: value,
				amount: amount
			});

			i++;
		}

		this._options = result;
	}

	return this._options;
};


Product.prototype.discount = function discount() {
	var flat = parser.amount(this.get('discount_amount')),
		rate = parser.amount(this.get('discount_rate')),
		num = parseInt(this.get('discount_num'), 10) || 0,
		limit = Math.max(num, this.get('quantity') - 1),
		result = 0,
		amount;

	if (flat) {
		result += flat;
		result += parser.amount(this.get('discount_amount2') || flat) * limit;
	} else if (rate) {
		amount = this.amount();

		result += rate * amount / 100;
		result += parser.amount(this.get('discount_rate2') || rate) * amount * limit / 100;
	}

	return result.toFixed(2);
};


Product.prototype.amount = function amount(config) {
	var result, options, len, i;

	if (!this._amount) {
		result = this.get('amount');
		options = this.options();

		for (i = 0, len = options.length; i < len; i++) {
			result += options[i].amount;
		}

		this._amount = result;
	}

	if (config && config.currency_code) {
		return currency(this._amount, config.currency_code);
	} else {
		return this._amount;
	}
};

Product.prototype.total = function total(config) {
	var result;

	if (!this._total) {
		result  = this.get('quantity') * this.amount();
		result -= this.discount();

		this._total = result;
	}

	if (config && config.currency_code) {
		return currency(this._total, config.currency_code);
	} else {
		return this._total;
	}
};


Product.prototype.isEqual = function isEqual(data) {
	var match = false;

	if (data instanceof Product) {
		data = data._data;
	}

	if (this.get('item_name') === data.item_name) {
		if (this.get('item_number') === data.item_number) {
			if (this.get('amount') === parseFloat(data.amount)) {
				var i = 0;

				match = true;

				while (typeof data['os' + i] !== 'undefined') {
					if (this.get('os' + i) !== data['os' + i]) {
						match = false;
						break;
					}

					i++;
				}
			}
		}
	}

	return match;
};


Product.prototype.destroy = function destroy() {
    this._data = [];
    this.fire('destroy', this);
};




module.exports = Product;
