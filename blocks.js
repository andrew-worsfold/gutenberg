"use strict";

/**
 * Derived functions
 */
var getNextSibling = siblingGetter( 'next' );
var getPreviousSibling = siblingGetter( 'previous' );
var getTagType = getConfig.bind( null, 'tagTypes' );
var getTypeKinds = getConfig.bind( null, 'typeKinds' );
var setImageFullBleed = setImageState.bind( null, 'align-full-bleed' );
var setImageAlignNone = setImageState.bind( null, '' );
var setImageAlignLeft = setImageState.bind( null, 'align-left' );
var setImageAlignRight = setImageState.bind( null, 'align-right' );

/**
 * Globals
 */
var config = {
	tagTypes: {
		'BLOCKQUOTE': 'quote',
		'H1': 'heading',
		'H2': 'heading',
		'H3': 'heading',
		'H4': 'heading',
		'H5': 'heading',
		'H6': 'heading',
		'IMG': 'image',
		'P': 'paragraph',
		'default': 'paragraph'
	},
	typeKinds: {
		'quote': [ 'text' ],
		'heading': [ 'heading', 'text' ],
		'image': [ 'image' ],
		'paragraph': [ 'text' ],
		'default': []
	},
	typeToTag: {
		paragraph: 'p',
		quote: 'blockquote',
		heading: 'h2'
	}
};

var editor = queryFirst( '.editor' );
var switcher = queryFirst( '.block-switcher' );
var switcherMenu = queryFirst( '.switch-block__menu' );
var blockControls = queryFirst( '.block-controls' );
var inlineControls = queryFirst( '.inline-controls' );
var insertBlockButton = queryFirst( '.insert-block__button' );
var insertBlockMenu = queryFirst( '.insert-block__menu' );
var imageFullBleed = queryFirst( '.block-image__full-width' );
var imageAlignNone = queryFirst( '.block-image__no-align' );
var imageAlignLeft = queryFirst( '.block-image__align-left' );
var imageAlignRight = queryFirst( '.block-image__align-right' );

var selectedBlock = null;

var supportedBlockTags = Object.keys( config.tagTypes )
	.slice( 0, -1 ) // remove 'default' option
	.map( function( tag ) { return tag.toLowerCase(); } );

/**
 * Initialization
 */
window.addEventListener( 'click', clearBlocks, false );
editor.addEventListener( 'input', attachBlockHandlers, false );
editor.addEventListener( 'input', clearBlocks, false );
insertBlockButton.addEventListener( 'click', openBlockMenu, false );
insertBlockMenu.addEventListener( 'click', function( event ) {
	event.stopPropagation();
}, false );
window.addEventListener( 'mouseup', onSelectText, false );

cloneSwitcher();
attachBlockHandlers();
attachTypeSwitcherActions();

/**
 * Core logic
 */
function cloneSwitcher() {
	getBlocks().forEach( function( block ) {
		var container = document.createElement( 'div' );
		var blockSwitcher = switcher.cloneNode( true );

		var blockType = getTagType( block.nodeName );
		query( '.type svg', blockSwitcher ).forEach( function ( typeButton ) {
			typeButton.style.display = 'none';
		} );
		var switcherQuery = '.type-icon-' + blockType;
		queryFirst( switcherQuery, blockSwitcher ).style.display = 'block';

		container.className = 'block-container';
		editor.insertBefore( container, block );
		container.appendChild( blockSwitcher );
		container.appendChild( block );
		attachControlActions( block );
	} );
}

function attachBlockHandlers() {
	getBlocks().forEach( function( block ) {
		bind( 'click', block, selectBlock );
	} );
}

function getBlocks() {
	return Array.prototype.concat.apply( [],
			supportedBlockTags.map( query ) );
}

function selectBlock( event ) {
	clearBlocks();
	event.stopPropagation();
	event.target.className += ' is-selected';

	selectedBlock = event.target;
	showControls( selectedBlock );
}

function clearBlocks() {
	getBlocks().forEach( function( block ) {
		block.className = block.className.replace( 'is-selected', '' );
	} );
	selectedBlock = null;

	hideControls();
	hideMenu();
}

function showControls( node ) {
	var blockType = getTagType( node.nodeName );
	var position = node.getBoundingClientRect();

	// show/hide block-specific block controls
	var kinds = getTypeKinds( blockType );
	var kindClasses = kinds.map( function( kind ) {
		return 'is-' + kind;
	} ).join( ' ' );
	blockControls.className = 'block-controls ' + kindClasses;
	blockControls.style.display = 'block';

	// reposition block-specific block controls
	blockControls.style.top = ( position.top - 36 + window.scrollY ) + 'px';
	blockControls.style.maxHeight = 'none';
}

function hideControls() {
	switcherMenu.style.display = 'none';
	blockControls.style.display = 'none';
}

// Show popup on text selection
function onSelectText( event ) {
	event.stopPropagation();
	var txt = "";

	if ( window.getSelection ) {
		txt = window.getSelection();
	} else if ( document.getSelection ) {
		txt = document.getSelection();
	} else if ( document.selection ) {
		txt = document.selection.createRange().text;
	}

	// Show formatting bar
	if ( txt != '' ) {
		inlineControls.style.display = 'block';
		var range = txt.getRangeAt(0);
		var pos = range.getBoundingClientRect();
		var selectCenter = pos.width / 2;
		var controlsCenter = inlineControls.offsetWidth / 2;
		inlineControls.style.left = ( pos.left + selectCenter - controlsCenter ) + 'px';
		inlineControls.style.top = ( pos.top - 48 + window.scrollY ) + 'px';
	} else {
		inlineControls.style.display = 'none';
	}
}

function attachControlActions( block ) {
	var buttons = query( '.block-switcher svg', block.parentNode );
	buttons.forEach( function( button ) {
		bind( 'click', button, switchType );
	} );

	var blockSwitcher = queryFirst( '.block-switcher', block.parentNode );
	Array.from( blockSwitcher.childNodes ).forEach( function( node ) {
		if ( 'svg' !== node.nodeName ) {
			return;
		}

		var classes = node.className.baseVal;
		var getter = {
			up: getPreviousSibling,
			down: getNextSibling
		}[ classes ];

		if ( getter ) {
			node.addEventListener( 'click', function( event ) {
				event.stopPropagation();
				clearBlocks();
				block.classList.add( 'is-selected' );
				selectedBlock = block;
				swapNodes(
					selectedBlock.parentNode,
					getter( selectedBlock.parentNode )
				);
				attachBlockHandlers();
				attachControlActions( queryFirst( '.is-selected' ) );
			}, false );
		}
	} );

	imageFullBleed.addEventListener( 'click', setImageFullBleed, false );
	imageAlignNone.addEventListener( 'click', setImageAlignNone, false );
	imageAlignLeft.addEventListener( 'click', setImageAlignLeft, false );
	imageAlignRight.addEventListener( 'click', setImageAlignRight, false );
}

function attachTypeSwitcherActions() {
	Object.keys( config.typeToTag ).forEach( function( type ) {
		var selector = '.switch-block__block .type-icon-' + type;
		var button = queryFirst( selector );
		var label = queryFirst( selector + ' + label' );

		bind( 'click', button, switchBlockType );
		bind( 'click', label, switchBlockType );

		function switchBlockType( event ) {
			if ( ! selectedBlock ) {
				return;
			}

			var openingRe = /^<\w+/;
			var closingRe = /\w+>$/;
			var tag = config.typeToTag[ type ];
			selectedBlock.outerHTML = selectedBlock.outerHTML
				.replace( openingRe, '<' + tag )
				.replace( closingRe, tag + '>' );
			clearBlocks();
			attachBlockHandlers();
		}
	} );
}

function swapNodes( a, b ) {
	if ( ! ( a && b ) ) {
		return false;
	}

	var parent = a.parentNode;
	if ( ! parent ) {
		return false;
	}

	// insert node copies before removal
	parent.replaceChild( b.cloneNode( true ), a );
	parent.replaceChild( a.cloneNode( true ), b );

	return true;
}

/**
 * Utility functions
 */
function siblingGetter( direction ) {
	var sibling = direction + 'Sibling';

	return function getAdjacentSibling( node ) {
		if ( null === node ) {
			return null;
		}

		if ( null === node[ sibling ] ) {
			return null;
		}

		if ( '#text' === node[ sibling ].nodeName ) {
			return getAdjacentSibling( node[ sibling ] );
		}

		return node[ sibling ];
	}
}

function openBlockMenu( event ) {
	event.stopPropagation();
	insertBlockMenu.style.display = 'block';
}

function hideMenu() {
	insertBlockMenu.style.display = 'none';
}

function showSwitcherMenu( event ) {
	event.stopPropagation();

	var position = queryFirst( '.block-container:hover .block-switcher' )
		.getBoundingClientRect();
	switcherMenu.style.top = ( position.top + 42 + window.scrollY ) + 'px';
	switcherMenu.style.left = ( position.left - 32 + window.scrollX ) + 'px';
	switcherMenu.style.display = 'block';
}

function switchType( event ) {
	var block = event.target
		.closest( '.block-container' )
		.childNodes[1];
	selectedBlock = block;
	showSwitcherMenu( event );
}

function setImageState( classes, event ) {
	event.stopPropagation();
	selectedBlock.className = 'is-selected ' + classes;
}

function l( data ) {
	console.log.apply( console.log, arguments );
	return data;
}

function bind( eventType, node, callback, useCapture ) {
	node.removeEventListener( eventType, callback, !! useCapture );
	node.addEventListener( eventType, callback, !! useCapture );
}

function query( selector, baseNode ) {
	var node = baseNode && baseNode.querySelectorAll
		? baseNode
		: document;
	return Array.from( node.querySelectorAll( selector ) );
}

function queryFirst( selector, baseNode ) {
	return query( selector, baseNode )[ 0 ];
}

function getConfig( configName, tagName ) {
	return config[ configName ][ tagName ] ||
		config[ configName ].default;
}
