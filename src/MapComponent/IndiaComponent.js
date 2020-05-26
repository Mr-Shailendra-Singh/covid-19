import React, {useRef, useEffect, useState,useContext} from 'react';
import './IndiaComponent.scss';
import { select, selectAll,geoPath, geoMercator, min, max, scaleLinear ,geoTransverseMercator} from "d3";
import {feature}from "topojson-client";
import {FetchDataContext} from '../context/fetch-data';
const IndiaComponent = props=>{
    
    const width = 600;
    const height = 500;
    const fetchCovidData = useContext(FetchDataContext);
    const stateDistrictDataJsonUrl = '../map/';
    const requestOption = {
        method:"GET"
    };
    let indiaSvgRef = useRef(),indiaSvg;
    let stateSvgRef = useRef(),stateSvg;
    const [indiaJson,setIndiaJson] = useState();
    const [selectedState, setSelectedState] = useState('');
    const [stateJson,setStateJson] = useState();
    const [hoverState, setHoverState] = useState('');
    const [hoverDistrict, setHoverDistrict] = useState('');
    const fetchData = async(dataJsonUrl)=>{
        const response = await fetch(dataJsonUrl,requestOption);
        if(response.ok){
            let resJson = await response.json();
            return resJson;
        }else{
            throw Error("Unable to fetch the data");
        }
    };
    useEffect(()=>{
        const dataCall = async ()=>{
            const indiaJsonUrl = `${stateDistrictDataJsonUrl}india.json`;
            const data = await fetchData(indiaJsonUrl);
            setIndiaJson(data);
        };
        if(fetchCovidData && fetchCovidData.statewise){
            dataCall();
        }
    },[fetchCovidData]);

    useEffect(()=>{
        if(indiaJson &&  fetchCovidData.statewise.length>0){
        indiaSvg = select(indiaSvgRef.current)
                    .attr("width",500)
                    .attr("height",500)
                    .attr("viewBox", `0 0 500 600`);
        const indianStates = indiaJson.objects["india-states"];
        var states = feature(indiaJson, indianStates);
        states.features.map((featurestate)=>{
            featurestate.properties["confirmed"] = parseInt(fetchCovidData.statewise.filter((data)=> data.state === featurestate.properties["st_nm"])[0].confirmed);
            
        });
        
        const minProp = min(states.features, feature => feature.properties['confirmed']);
        const maxProp = max(states.features, feature => feature.properties['confirmed']);
        const colorScale = scaleLinear().domain([minProp, maxProp]).range(["#ccc", "red"]);

        // projects geo-coordinates on a 2D plane
        const projection = geoMercator()
                            .fitSize([width, height], states);
        const pathGenerator = geoPath().projection(projection);                            
        let prevSelectedState = ''; 
        indiaSvg.selectAll(".states")
            .data(states.features)
            .enter()
            .append('path')
            .on("click",  (feature,i, nodes) => {
                console.log("----",feature);
                if(prevSelectedState){
                    select(prevSelectedState).classed("stateselected",false);
                } 
                select(nodes[i]).classed("stateselected",true);
                prevSelectedState = nodes[i];
                setSelectedState(feature["id"] );
                setHoverDistrict('');
            })
            .on("mouseenter", (feature,i, nodes) => {
                console.log(feature);
                setHoverState(feature.properties["st_nm"])         
            })
            .on("mouseout", (feature,i, nodes) => {
                console.log(feature);
                setHoverState('');
            })
            .attr('class',"state")
            .transition()   
            .attr("fill",feature=>colorScale(feature.properties['confirmed']))
            .attr('d',d=>pathGenerator(d))
            
        }
        return (()=>{
            // Clean up 
        })
    },[indiaJson]);
    useEffect(()=>{
        const dataCall = async ()=>{
            const stateJsonUrl = `${stateDistrictDataJsonUrl}${selectedState.toLowerCase().split(' ').join("")}.json`;
            const data = await fetchData(stateJsonUrl);
            setStateJson(data);
        };
        if(selectedState){
            dataCall();
        }
        
    },[selectedState]);
    useEffect(()=>{
        if(selectedState && stateJson){
            let filterState,filterDistrict;
            stateSvg = select(stateSvgRef.current)
                        .attr("width",500)
                        .attr("height",500)
                        .attr("viewBox", `0 0 400 500`);
            const statesDistrict = stateJson.objects[`${selectedState.toLowerCase().split(' ').join("")}_district`];
            const featureDistrict = feature(stateJson, statesDistrict);
            featureDistrict.features.map((featurestate)=>{
                filterState = fetchCovidData.stateDistrict.filter((data)=> data.state === featurestate.properties["st_nm"])[0];

                filterDistrict = filterState["districtData"].filter((distrctname)=>
                    distrctname.district === featurestate.properties["district"]
                )[0];
                featurestate.properties["confirmed"] = filterDistrict.confirmed;
                featurestate.properties["recovered"] = filterDistrict.recovered;
                featurestate.properties["active"] = filterDistrict.active;
                featurestate.properties["deceased"] = filterDistrict.deceased;
            });
            console.log("featureDistrict",featureDistrict);

            const minProp = min(featureDistrict.features, feature => feature.properties['confirmed']);
            const maxProp = max(featureDistrict.features, feature => feature.properties['confirmed']);
            console.log("minProp",minProp);
            console.log("maxProp",maxProp);
            const colorScale = scaleLinear().domain([minProp, maxProp]).range(["#ccc", "red"]);

           // projects geo-coordinates on a 2D plane
            const projection = geoMercator()
                                .fitSize([400, 400], featureDistrict);
            const pathGenerator = geoPath().projection(projection);    
            var svgdistrict = stateSvg.selectAll(".district")
            .data(featureDistrict.features)
            .enter()
            .append('path')
            .on("mouseenter", feature => {
                console.log("dis--",feature);
                setHoverDistrict(feature.properties)         
            })
            .attr('class',"district")
            .transition()   
            .attr("fill",feature=>colorScale(feature.properties['confirmed']))
            .attr('d',d=>pathGenerator(d));


        }
        return(()=>{
            // Remove old selection before new Useeffect 
            selectAll(".indiastate path").remove();
        })
    },[stateJson])
    return (
        <>
            <div className="map">
                <div className="indiamap">
                    <div className="indiamap__heading-container">
                            <p className="indiamap__heading">India Map</p>
                            <p className="indiamap__detail-message">Select a State for more details</p>
                        {/* <div className="indiamap__detail-message">
                            
                        </div> */}
                    </div>
                    {selectedState && 
                    <div className="indiamap__selectedstate">
                         <p className="indiamap__selectedlabel">{"Selected state"}</p>
                        <p className="indiamap__selectedtext">{selectedState}</p>
                    </div>
                    }
                    <svg ref={indiaSvgRef}></svg>
                    { hoverState &&
                    <div className="indiamap__hoverstate">
                        <p className="indiamap__hoverlabel">{"You are on"}</p>
                        <p>{hoverState}</p>
                    </div>
                    }
                </div>
                {selectedState &&
                    <>
                        <div className="indiastate">
                            <div className="indiamap__heading-container">
                                <p className="indiamap__heading">District(s) of {selectedState}</p>
                            </div>
                            <svg ref={stateSvgRef}></svg> 
                            {hoverDistrict && 
                            <>
                            <div className="indiastate__hoverdistrict">
                                <span>{"District:  "}</span>
                                <span className="indiastate__hoverdistrictname">{hoverDistrict.district}</span>
                            </div>
                            <div className="district-stats">
                                
                                <div className="district-stats__confirmed">
                                    <p>Confirmed</p>
                                    <p>{hoverDistrict.confirmed}</p>
                                </div>
                                <div className="district-stats__active">
                                    <p>Active</p>
                                    <p>{hoverDistrict.active}</p>
                                </div>
                                <div className="district-stats__recovered">
                                    <p>Recovered</p>
                                    <p>{hoverDistrict.recovered}</p>
                                </div>
                                <div className="district-stats__deceased">
                                    <p>Deceased</p>
                                    <p>{hoverDistrict.deceased}</p>
                                </div>
                            </div>
                            </>
                            }                   
                        </div>
                       
                    </>
                }
                {!selectedState && 
                    <div className="blankmessage">
                        Select a state from map
                    </div>
                }      
            </div>
            
            
        </>
    )
}

export default IndiaComponent;