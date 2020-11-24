const {defaultSettings} = require('../util/default.json');
const {escapeText} = require('./util.js');
const i18n = {
	en: require('./i18n/en.json'),
	de: require('./i18n/de.json'),
	pl: require('./i18n/pl.json')
};

/**
 * A language.
 * @class
 */
class Lang {
	/**
	 * Creates a new language.
	 * @param {String} [lang] - The language code.
	 * @param {String} [namespace] - The namespace for the language.
	 * @constructs Lang
	 */
	constructor(lang = defaultSettings.lang, namespace = '') {
		if ( !( typeof lang === 'string' && lang in i18n ) ) lang = defaultSettings.lang;
		this.lang = lang;
		this.namespace = namespace;
		this.fallback = ( i18n?.[lang]?.fallback.slice() || [defaultSettings.lang] ).filter( fb => fb.trim() );
	}

	/**
	 * Get a localized message.
	 * @param {String} message - Name of the message.
	 * @param {Boolean} escaped - If the message should be HTML escaped.
	 * @param {(String|import('cheerio'))[]} args - Arguments for the message.
	 * @returns {String}
	 */
	get(message = '', escaped = false, ...args) {
		if ( this.namespace.length ) message = this.namespace + '.' + message;
		let keys = ( message.length ? message.split('.') : [] );
		let lang = this.lang;
		let text = i18n?.[lang];
		let fallback = 0;
		for (let n = 0; n < keys.length; n++) {
			if ( text ) {
				text = text?.[keys[n]];
				if ( typeof text === 'string' ) text = text.trim()
			}
			if ( !text ) {
				if ( fallback < this.fallback.length ) {
					lang = this.fallback[fallback];
					fallback++;
					text = i18n?.[lang];
					n = -1;
				}
				else {
					n = keys.length;
				}
			}
		}
		if ( typeof text === 'string' ) {
			if ( escaped ) text = escapeText(text);
			args.forEach( (arg, i) => {
				if ( escaped && typeof arg !== 'string' ) {
					text = text.replaceSave( new RegExp( `\\[([^\\]]+)\\]\\(\\$${i + 1}\\)`, 'g' ), (m, linkText) => {
						return arg.html(linkText);
					} );
				}
				text = text.replaceSave( new RegExp( `\\$${i + 1}`, 'g' ), arg );
			} );
			if ( text.includes( 'PLURAL:' ) ) text = text.replace( /{{\s*PLURAL:\s*[+-]?(\d+)\s*\|\s*([^\{\}]*?)\s*}}/g, (m, number, cases) => {
				return plural(lang, parseInt(number, 10), cases.split(/\s*\|\s*/));
			} );
		}
		return ( text || '⧼' + message + ( isDebug && args.length ? ': ' + args.join(', ') : '' ) + '⧽' );
	}
}

/**
 * Parse plural text.
 * @param {String} lang - The language code.
 * @param {Number} number - The amount.
 * @param {String[]} args - The possible text.
 * @returns {String}
 */
function plural(lang, number, args) {
	// https://translatewiki.net/wiki/Plural/Mediawiki_plural_rules
	var text = args[args.length - 1];
	switch ( lang ) {
		case 'fr':
		case 'hi':
			if ( number <= 1 ) text = getArg(args, 0);
			else text = getArg(args, 1);
			break;
		case 'pl':
			if ( number === 1 ) text = getArg(args, 0);
			else if ( [2,3,4].includes( number % 10 ) && ![12,13,14].includes( number % 100 ) ) {
				text = getArg(args, 1);
			}
			else text = getArg(args, 2);
			break;
		case 'ru':
			if ( args.length > 2 ) {
				if ( number % 10 === 1 && number % 100 !== 11 ) text = getArg(args, 0);
				else if ( [2,3,4].includes( number % 10 ) && ![12,13,14].includes( number % 100 ) ) {
					text = getArg(args, 1);
				}
				else text = getArg(args, 2);
			}
			else {
				if ( number === 1 ) text = getArg(args, 0);
				else text = getArg(args, 1);
			}
			break;
		case 'bn':
		case 'de':
		case 'en':
		case 'es':
		case 'ja':
		case 'nl':
		case 'pt-br':
		case 'th':
		case 'tr':
		case 'ja':
		case 'zh-hans':
		case 'zh-hant':
		default:
			if ( number === 1 ) text = getArg(args, 0);
			else text = getArg(args, 1);
	}
	return text;
}

/**
 * Get text option.
 * @param {String[]} args - The list of options.
 * @param {Number} index - The preferred option.
 * @returns {String}
 */
function getArg(args, index) {
	return ( args.length > index ? args[index] : args[args.length - 1] );
}

module.exports = Lang;