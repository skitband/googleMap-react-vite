import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { connect } from 'react-redux';

import ListSearches from './ListSearches';
import { clearSelecteedTodoForEditing } from '../store/actions/list';

const MapControls = ({
  inRef,
  loading,
  inputSearchRef,
  onClickItem,
}) => {
  return (
    <Card
      ref={inRef}
      component="fieldset"
      disabled={!loading}
      className="cardTools"
    >
      <CardContent>
          <Box sx={{width: 300, maxWidth: '100%'}}>
          <TextField
            inputRef={inputSearchRef}
            disabled={!loading}
            fullWidth
            id="inputLocation"
            label="Search for location"
            placeholder=""
            size="small"
            variant="outlined"
            inputProps={{ type: "search", className: "text-ellipsis" }}
          />
          <ListSearches onClickItem={onClickItem} />
          </Box>
      </CardContent>
    </Card>
	);
}

const mapStateToProps = (state) => {
  return {
    selectedTaskToEditOrAdd: state.listSearch.selectedTaskToEditOrAdd,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    clearSelecteedTodoForEditing: () => {
      dispatch(clearSelecteedTodoForEditing());
    },
  }
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)((MapControls));
