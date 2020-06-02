/**
 * WordPress dependencies
 */
import { speak } from '@wordpress/a11y';
import { Notice } from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const INVALID_LEVEL_MESSAGE = __(
	'The selected heading level may be invalid. See the content structure tool for more info.'
);

export default function HeadingLevelChecker( {
	selectedLevel,
	levelIsInvalid,
} ) {
	// For accessibility, announce the invalid heading level to screen readers.
	// The selectedLevel value is included in the dependency array so that the
	// message will be replayed if a new level is selected, but the new level is
	// still invalid.
	useEffect( () => {
		if ( levelIsInvalid ) speak( INVALID_LEVEL_MESSAGE );
	}, [ selectedLevel, levelIsInvalid ] );

	if ( ! levelIsInvalid ) {
		return null;
	}

	return (
		<Notice
			className="block-library-heading__heading-level-checker-warning"
			isDismissible={ false }
			status="warning"
		>
			{ INVALID_LEVEL_MESSAGE }
		</Notice>
	);
}
