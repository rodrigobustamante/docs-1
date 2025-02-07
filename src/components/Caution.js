import PropTypes from 'prop-types';
import React from 'react';
import {Box, Text} from '@chakra-ui/react';
import {HighlightKeyTerms} from '@apollo/pedia';

export const Caution = ({children, ...props}) => {
  return (
    <Box
      pl="4"
      py="1"
      borderLeftWidth="4px"
      borderColor="yellow.400"
      fontSize="md"
      sx={{
        '>': {
          ':not(:last-child)': {
            mb: 2
          }
        }
      }}
      {...props}
    >
      <Text>
        ⚠️ <strong>CAUTION</strong>
      </Text>
      <HighlightKeyTerms>{children}</HighlightKeyTerms>
    </Box>
  );
};

Caution.propTypes = {
  children: PropTypes.node.isRequired
};
