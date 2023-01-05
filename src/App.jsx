import { useRef, useState, useCallback } from 'react';
import { connect } from 'react-redux';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import MapControls from './components/MapControls';
import Gmap from './components/Gmap';
import { db } from './configs/db';
import uid from './utils/uid';
import { getListSearch, clearSelecteedTodoForEditing } from './store/actions/list';

function App(props) {
  const formRef = useRef();
  const inputSearchRef = useRef();
  const infowindowContentRef = useRef();
  const infoWindowRef = useRef();
  const markerRef = useRef();
  const [gmap, setGmap] = useState();

  const saveSearch = async (data) => {
    try {
      const id = await db.list.add({
        ...data,
        id: uid(),
        title: data.title || "",
        created_at: new Date().toISOString(),
        address: data.address || "",
        geometry: data.geometry || {},
      });
      
      id && props.getListSearch();
    } catch (err) {
      console.log('err: ', err);
      setAlertMsg({ type: "failed_save", msg: "Failed save location" });
    }
  }

  const onLoadGmap = useCallback((api) => {
    setGmap(api);
    const { map, maps } = gmap || api;
    if(formRef.current){
      api.map.controls[google.maps.ControlPosition.TOP_LEFT].push(formRef.current);
    }

    const searchRef = inputSearchRef.current;
    const autocomplete = new maps.places.Autocomplete(searchRef, {
      strictBounds: false,
      fields: ["formatted_address", "geometry", "name"], 
      types: ["establishment"],
    });
    // Bind the map's bounds (viewport) property to the autocomplete object,
    // so that the autocomplete requests use the current map bounds for the bounds option in the request.
    autocomplete.bindTo("bounds", map);

    const infoWinContentRef = infowindowContentRef.current;
    infoWindowRef.current = new maps.InfoWindow({ maxWidth: 350 });
    infoWindowRef.current.setContent(infoWinContentRef);

    markerRef.current = new maps.Marker({
      map,
      anchorPoint: new maps.Point(0, -29),
    });

    infoWindowRef.current.addListener('closeclick', () => {
      markerRef.current.setVisible(false);
      searchRef.value = "";

      if(props?.selectedTaskToEditOrAdd?.id){
        props.clearSelecteedTodoForEditing();
      }
    });

    autocomplete.addListener("place_changed", async () => {
      infoWindowRef.current.close();
      markerRef.current.setVisible(false);
      const { geometry, name, formatted_address, ...etc } = await autocomplete.getPlace();
      if (!geometry || !geometry.location) {
        // User entered the name of a Place that was not suggested & pressed the Enter key, or the Place Details request failed.
        setAlertMsg({ type: "no_geometry", msg: `No details available for input: ${name}` });
        return;
      }
      // If the place has a geometry, then present it on a map.
      if (geometry.viewport) {
        map.fitBounds(geometry.viewport);
      }
      else {
        map.setCenter(geometry.location);
        map.setZoom(17);
      }

      const location = {
        lat: geometry.location.lat(),
        lng: geometry.location.lng(),
      };

      markerRef.current.setPosition(geometry.location);
      markerRef.current.setVisible(true);
      infoWindowRef.current.content.children["place-name"].textContent = name;
      infoWindowRef.current.content.children["place-address"].textContent = `${formatted_address}\n\nLatitude     : ${location.lat} °\nLongitude  : ${location.lng} °`;
      infoWindowRef.current.open(map, markerRef.current);

      saveSearch({
        title: name,
        address: formatted_address,
        geometry: { location },
        etc
      });
    });

    const biasInputElement = document.getElementById("use-location-bias");
    const strictBoundsInputElement = document.getElementById("use-strict-bounds");

    // Sets a listener on a radio button to change the filter type on Places Autocomplete.
    function setupClickListener(id, types){
      const radioButton = document.getElementById(id);
      radioButton && radioButton.addEventListener("click", () => {
        autocomplete.setTypes(types);
        searchRef.value = "";
      });
    }

    biasInputElement && biasInputElement.addEventListener("change", () => {
      if (biasInputElement.checked) {
        autocomplete.bindTo("bounds", map);
      }
      else {
        // User wants to turn off location bias, so three things need to happen:
        // 1. Unbind from map
        // 2. Reset the bounds to whole world
        // 3. Uncheck the strict bounds checkbox UI (which also disables strict bounds)
        autocomplete.unbind("bounds");
        autocomplete.setBounds({ east: 180, west: -180, north: 90, south: -90 });
        strictBoundsInputElement.checked = biasInputElement.checked;
      }
      searchRef.value = "";
    });

    strictBoundsInputElement && strictBoundsInputElement.addEventListener("change", () => {
      autocomplete.setOptions({
        strictBounds: strictBoundsInputElement.checked,
      });
      if (strictBoundsInputElement.checked) {
        biasInputElement.checked = strictBoundsInputElement.checked;
        autocomplete.bindTo("bounds", map);
      }
      searchRef.value = "";
    });
  }, [gmap]);

  const onErrorGmap = (err) => {
    setAlertMsg({ type: "error_load_gmap", msg: err });
  }

  const onClickItem = (val) => {
    const infoWin = infoWindowRef.current;
    if(infoWin){
      const { title, address, geometry } = val;
      infoWin.close();
      markerRef.current.setVisible(false);

      if (!geometry || !geometry.location) {
        setAlertMsg({ type: "no_geometry", msg: `No details available for input: ${title}` });
        return;
      }
      const { map } = gmap
      if (geometry.location) {
        map.setCenter(geometry.location);
        map.setZoom(17);
      }
      markerRef.current.setPosition(geometry.location);
      markerRef.current.setVisible(true);
      infoWin.content.children["place-name"].textContent = title;
      infoWin.content.children["place-address"].textContent = `${address}\n\nLatitude     : ${geometry.location.lat} °\nLongitude  : ${geometry.location.lng} °`;
      infoWin.open(map, markerRef.current);
    }
  }

  return (
    <>
      <Container maxWidth="lg">
        <MapControls
          inRef={formRef}
          loading={!!gmap}
          inputSearchRef={inputSearchRef}
          onClickItem={onClickItem}
        />
        <Box justifyContent="center" alignItems="center" sx={{ bgcolor: '#fff', height: '80vh', marginTop: 8 }}>
        <Gmap
          params={{
            key: "AIzaSyDSKsr1WK1DcCmD49tsJ1nZMgKT8RJC9EE",
            libraries: "places",
            v: "weekly"
          }}
          onLoad={onLoadGmap}
          onError={onErrorGmap}
        />
        <div
          ref={infowindowContentRef}
          id="infowindow-content"
        >
          <div id="place-name" className="fw700" />
          <hr/>
          <address id="place-address" className="pre-wrap" />
        </div>
        </Box>
        <Box component="footer" sx={{ bgcolor: 'background.paper', py: 6 }}>
      <Container maxWidth="lg">
        <Typography variant="h6" align="center">
          GoogleMap Autocomplete 
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
        >
          Created By: Sergio Lio (applicant)
        </Typography>
      </Container>
    </Box>
      </Container>
    </>
  )
}

const mapStateToProps = (state) => {
  return {
    selectedTaskToEditOrAdd: state.listSearch.selectedTaskToEditOrAdd,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getListSearch: () => {
      dispatch(getListSearch());
    },
    clearSelecteedTodoForEditing: () => {
      dispatch(clearSelecteedTodoForEditing());
    },
  }
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)((App));
