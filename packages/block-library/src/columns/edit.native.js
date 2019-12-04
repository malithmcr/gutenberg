/**
 * External dependencies
 */
import classnames from 'classnames';
import { View } from 'react-native';
import { dropRight, times } from 'lodash';
import BlockEdit from '../block-edit';
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	PanelBody,
	RangeControl,
	BottomSheet,
	SVG,
	Path,
	Toolbar,
	ToolbarButton,
} from '@wordpress/components';
import {
	InspectorControls,
	InnerBlocks,
	BlockControls,
	BlockVerticalAlignmentToolbar,
} from '@wordpress/block-editor';
import { withDispatch, useSelect } from '@wordpress/data';
import { createBlock } from '@wordpress/blocks';
import { useState, useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import {
	// getColumnsTemplate,
	hasExplicitColumnWidths,
	getMappedColumnWidths,
	getRedistributedColumnWidths,
	toWidthPrecision,
} from './utils';
import Icon from './icon';
import styles from './editor.scss';

/**
 * Allowed blocks constant is passed to InnerBlocks precisely as specified here.
 * The contents of the array should never change.
 * The array should contain the name of each block that is allowed.
 * In columns block, the only block we allow is 'core/column'.
 *
 * @constant
 * @type {string[]}
 */
// const ALLOWED_BLOCKS = [ 'core/column' ];
const ALLOWED_BLOCKS = [ 'core/button', 'core/paragraph', 'core/heading', 'core/list' ];

/**
 * Template option choices for predefined columns layouts.
 *
 * @constant
 * @type {Array}
 */
const TEMPLATE_OPTIONS = [
	{
		title: __( 'Two columns; equal split' ),
		icon: <SVG width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><Path fillRule="evenodd" clipRule="evenodd" d="M39 12C40.1046 12 41 12.8954 41 14V34C41 35.1046 40.1046 36 39 36H9C7.89543 36 7 35.1046 7 34V14C7 12.8954 7.89543 12 9 12H39ZM39 34V14H25V34H39ZM23 34H9V14H23V34Z" /></SVG>,
		template: [
			[ 'core/column' ],
			[ 'core/column' ],
		],
	},
	{
		title: __( 'Two columns; one-third, two-thirds split' ),
		icon: <SVG width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><Path fillRule="evenodd" clipRule="evenodd" d="M39 12C40.1046 12 41 12.8954 41 14V34C41 35.1046 40.1046 36 39 36H9C7.89543 36 7 35.1046 7 34V14C7 12.8954 7.89543 12 9 12H39ZM39 34V14H20V34H39ZM18 34H9V14H18V34Z" /></SVG>,
		template: [
			[ 'core/column', { width: 33.33 } ],
			[ 'core/column', { width: 66.66 } ],
		],
	},
	{
		title: __( 'Two columns; two-thirds, one-third split' ),
		icon: <SVG width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><Path fillRule="evenodd" clipRule="evenodd" d="M39 12C40.1046 12 41 12.8954 41 14V34C41 35.1046 40.1046 36 39 36H9C7.89543 36 7 35.1046 7 34V14C7 12.8954 7.89543 12 9 12H39ZM39 34V14H30V34H39ZM28 34H9V14H28V34Z" /></SVG>,
		template: [
			[ 'core/column', { width: 66.66 } ],
			[ 'core/column', { width: 33.33 } ],
		],
	},
	{
		title: __( 'Three columns; equal split' ),
		icon: <SVG width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><Path fillRule="evenodd" d="M41 14a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h30a2 2 0 0 0 2-2V14zM28.5 34h-9V14h9v20zm2 0V14H39v20h-8.5zm-13 0H9V14h8.5v20z" /></SVG>,
		template: [
			[ 'core/column' ],
			[ 'core/column' ],
			[ 'core/column' ],
		],
	},
	{
		title: __( 'Three columns; wide center column' ),
		icon: <SVG width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><Path fillRule="evenodd" d="M41 14a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v20a2 2 0 0 0 2 2h30a2 2 0 0 0 2-2V14zM31 34H17V14h14v20zm2 0V14h6v20h-6zm-18 0H9V14h6v20z" /></SVG>,
		template: [
			[ 'core/column', { width: 25 } ],
			[ 'core/column', { width: 50 } ],
			[ 'core/column', { width: 25 } ],
		],
	},
];

/**
 * Number of columns to assume for template in case the user opts to skip
 * template option selection.
 *
 * @type {number}
 */
const DEFAULT_COLUMNS = 2;

export function ColumnsEdit( {
	attributes,
	className,
	updateAlignment,
	updateColumns,
	clientId,
	isSelected,
} ) {
	const { verticalAlignment } = attributes;

	const { count } = useSelect( ( select ) => {
		return {
			count: select( 'core/block-editor' ).getBlockCount( clientId ),
		};
	} );
	const [ template, setTemplate ] = useState( 1 ) //getColumnsTemplate( count ) );
	const [ forceUseTemplate, setForceUseTemplate ] = useState( false );
	const [ columnCount, setColumnCount ] = useState( DEFAULT_COLUMNS );

	// This is used to force the usage of the template even if the count doesn't match the template
	// The count doesn't match the template once you use undo/redo (this is used to reset to the placeholder state).
	useEffect( () => {
		// Once the template is applied, reset it.
		if ( forceUseTemplate ) {
			setForceUseTemplate( false );
		}
	}, [ forceUseTemplate ] );

	const classes = classnames( className, {
		[ `are-vertically-aligned-${ verticalAlignment }` ]: verticalAlignment,
	} );

	// The template selector is shown when we first insert the columns block (count === 0).
	// or if there's no template available.
	// The count === 0 trick is useful when you use undo/redo.
	const showTemplateSelector = ( count === 0 && ! forceUseTemplate ) || ! template;

	if ( ! isSelected ) {
		return (
			[...Array(columnCount)].map((e, i) => 
				<View key={`${i}`} style={ styles.columnPlaceholder } />
			)
		);
	}

const renderColumns = () => {
	return [...Array(1)].map((e, i) =>				
		<InnerBlocks 
				key={`${i}`}
				renderAppender={ isSelected && InnerBlocks.ButtonBlockAppender }
				allowedBlocks={ ALLOWED_BLOCKS } 
				listKey={(item, index) => {
					return i+"_"+index+'_'+item.id+"_"; 
					}}
			/>
		)
	}

	return (
		<>
			{/* { ! showTemplateSelector && ( */}
				<>
					<InspectorControls>
						<PanelBody title={ __( 'Columns Settings' ) } >
							<RangeControl
								label={ __( 'Number of columns' ) }
								value={ count }
								defaultValue={ DEFAULT_COLUMNS }
								onChange={ ( value ) => {
									console.log(value)
									setColumnCount( value )
									// updateColumns( count, value ) 
								}
								}
								min={ 2 }
								max={ 6 }
								icon={ 'admin-links' }
							/>
						</PanelBody>
					</InspectorControls>
					<BlockControls>
						<Toolbar>
							<ToolbarButton
								title={ __( 'ColumnsButton' ) }
								icon={ <Icon width={20} height={20}/> }
								onClick={ () => console.log('click') }
							/>
						</Toolbar>
						<BlockVerticalAlignmentToolbar
							onChange={ updateAlignment }
							value={ verticalAlignment }
						/>
					</BlockControls>
				</>
			{/* ) } */}
			{/* <View className={ classes }> */}
			{ renderColumns() }
			 {/* <InnerBlocks
					renderAppender={ isSelected && InnerBlocks.ButtonBlockAppender }
					// __experimentalTemplateOptions={ TEMPLATE_OPTIONS }
					// __experimentalOnSelectTemplateOption={ ( nextTemplate ) => {
					// 	if ( nextTemplate === undefined ) {
					// 		nextTemplate = getColumnsTemplate( DEFAULT_COLUMNS );
					// 	}

					// 	setTemplate( nextTemplate );
					// 	setForceUseTemplate( true );
					// } }
					// __experimentalAllowTemplateOptionSkip
					// template={ showTemplateSelector ? null : template }
					// templateLock="all"
					allowedBlocks={ ALLOWED_BLOCKS }
					listKey={(item, index) => {
						return "_"+index+'_'+item.id; 
						}}
				/> */}
		
			{/* </View> */}
		</>
	);
}


export default ( ColumnsEdit );