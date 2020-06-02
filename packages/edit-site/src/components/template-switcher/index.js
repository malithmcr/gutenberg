/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';
import { resolveSelect, useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import {
	Tooltip,
	DropdownMenu,
	MenuGroup,
	MenuItemsChoice,
	MenuItem,
} from '@wordpress/components';
import { Icon, home, plus, undo } from '@wordpress/icons';

/**
 * Internal dependencies
 */
import TemplatePreview from './template-preview';
import ThemePreview from './theme-preview';

/**
 * Browser dependencies
 */
const { fetch } = window;

const TEMPLATE_OVERRIDES = {
	page: ( slug ) => `page-${ slug }`,
	category: ( slug ) => `category-${ slug }`,
	post: ( slug ) => `single-post-${ slug }`,
};

function TemplateLabel( { template, homeId } ) {
	return (
		<>
			{ template.slug }{ ' ' }
			{ template.id === homeId && (
				<Tooltip text={ __( 'Home' ) }>
					<div className="edit-site-template-switcher__label-home-icon">
						<Icon icon={ home } />
					</div>
				</Tooltip>
			) }
			{ template.status !== 'auto-draft' && (
				<Tooltip text={ __( 'Customized' ) }>
					<span className="edit-site-template-switcher__label-customized-dot" />
				</Tooltip>
			) }
		</>
	);
}

export default function TemplateSwitcher( {
	page,
	activeId,
	activeTemplatePartId,
	isTemplatePart,
	onActiveIdChange,
	onActiveTemplatePartIdChange,
	onAddTemplateId,
	onRemoveTemplateId,
} ) {
	const [ hoveredTemplate, setHoveredTemplate ] = useState();
	const [ themePreviewVisible, setThemePreviewVisible ] = useState( false );

	const onHoverTemplatePart = ( id ) => {
		setHoveredTemplate( { id, type: 'template-part' } );
	};
	const onMouseEnterTheme = () => {
		setThemePreviewVisible( () => true );
	};
	const onMouseLeaveTheme = () => {
		setThemePreviewVisible( () => false );
	};

	const [ homeId, setHomeId ] = useState();

	useEffect( () => {
		const effect = async () => {
			try {
				const { success, data } = await fetch(
					addQueryArgs( '/', { '_wp-find-template': true } )
				).then( ( res ) => res.json() );
				if ( success ) {
					let newHomeId = data.ID;
					if ( newHomeId === null ) {
						const { getEntityRecords } = resolveSelect( 'core' );
						newHomeId = (
							await getEntityRecords( 'postType', 'wp_template', {
								resolved: true,
								slug: data.post_name,
							} )
						 )[ 0 ].id;
					}
					setHomeId( newHomeId );
				} else {
					throw new Error();
				}
			} catch ( err ) {
				setHomeId( null );
			}
		};
		effect();
	}, [] );

	const { currentTheme, template, templateParts } = useSelect(
		( _select ) => {
			const {
				getCurrentTheme,
				getEntityRecord,
				getEntityRecords,
			} = _select( 'core' );
			const theme = getCurrentTheme();

			return {
				currentTheme: theme,
				template: getEntityRecord(
					'postType',
					'wp_template',
					activeId
				),
				templateParts: theme
					? getEntityRecords( 'postType', 'wp_template_part', {
							resolved: true,
							theme: theme?.stylesheet,
					  } )
					: null,
			};
		},
		[ activeId ]
	);

	const templateItem = {
		label: template ? (
			<TemplateLabel template={ template } homeId={ homeId } />
		) : (
			__( 'Loading…' )
		),
		value: activeId,
		slug: template ? template.slug : __( 'Loading…' ),
		content: template?.content,
	};

	const templatePartItems = templateParts?.map( ( templatePart ) => ( {
		label: <TemplateLabel template={ templatePart } />,
		value: templatePart.id,
		slug: templatePart.slug,
	} ) );

	const { saveEntityRecord } = useDispatch( 'core' );

	const overwriteSlug =
		TEMPLATE_OVERRIDES[ page.type ] &&
		page.slug &&
		TEMPLATE_OVERRIDES[ page.type ]( page.slug );
	const overwriteTemplate = async () => {
		const newTemplate = await saveEntityRecord( 'postType', 'wp_template', {
			slug: overwriteSlug,
			title: overwriteSlug,
			status: 'publish',
			content: templateItem.content.raw,
		} );
		onAddTemplateId( newTemplate.id );
	};
	const unoverwriteTemplate = async () => {
		await apiFetch( {
			path: `/wp/v2/templates/${ activeId }`,
			method: 'DELETE',
		} );
		onRemoveTemplateId( activeId );
	};

	return (
		<>
			<DropdownMenu
				popoverProps={ {
					className: 'edit-site-template-switcher__popover',
					position: 'bottom right',
				} }
				icon={ null }
				label={ __( 'Switch Template' ) }
				toggleProps={ {
					children: ( isTemplatePart
						? templatePartItems
						: [ templateItem ]
					).find(
						( choice ) =>
							choice.value ===
							( isTemplatePart ? activeTemplatePartId : activeId )
					).slug,
				} }
			>
				{ () => (
					<>
						<MenuGroup label={ __( 'Template' ) }>
							<MenuItem
								onClick={ () => onActiveIdChange( activeId ) }
							>
								{ templateItem.label }
							</MenuItem>
							{ overwriteSlug &&
								overwriteSlug !== templateItem.slug && (
									<MenuItem
										icon={ plus }
										onClick={ overwriteTemplate }
									>
										{ __( 'Overwrite Template' ) }
									</MenuItem>
								) }
							{ overwriteSlug === templateItem.slug && (
								<MenuItem
									icon={ undo }
									onClick={ unoverwriteTemplate }
								>
									{ __( 'Revert to Parent' ) }
								</MenuItem>
							) }
						</MenuGroup>
						<MenuGroup label={ __( 'Template Parts' ) }>
							<MenuItemsChoice
								choices={ templatePartItems }
								value={
									isTemplatePart
										? activeTemplatePartId
										: undefined
								}
								onSelect={ onActiveTemplatePartIdChange }
								onHover={ onHoverTemplatePart }
							/>
						</MenuGroup>
						<MenuGroup label={ __( 'Current theme' ) }>
							<MenuItem
								onMouseEnter={ onMouseEnterTheme }
								onMouseLeave={ onMouseLeaveTheme }
							>
								{ currentTheme.name }
							</MenuItem>
						</MenuGroup>
						{ !! hoveredTemplate?.id && (
							<TemplatePreview item={ hoveredTemplate } />
						) }
						{ themePreviewVisible && (
							<ThemePreview theme={ currentTheme } />
						) }
						<div className="edit-site-template-switcher__footer" />
					</>
				) }
			</DropdownMenu>
		</>
	);
}
