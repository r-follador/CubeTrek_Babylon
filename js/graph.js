export class GraphCube {
    constructor(jsonData) {
        this.metric = sharedObjects.metric;
        this.graphXAxis = GraphAxis.Distance;
        this.graphYAxis = GraphAxis.Elevation;

        var parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S%Z");
        let previousTime = parseDate(jsonData.geometry.coordinates[0][0][3]);
        let previousDistance = jsonData.geometry.coordinates[0][0][4];
        let previousElevation = jsonData.geometry.coordinates[0][0][2];
        let movingTime = 0;

        let verticalDistSumUp = 0;
        let verticalTimeSumUp = 0;
        let verticalDistSumDown = 0;
        let verticalTimeSumDown = 0;
        this.datas = [];

        for (var i=0; i<jsonData.geometry.coordinates[0].length; i++) {
            let time = parseDate(jsonData.geometry.coordinates[0][i][3]);
            let elevation = jsonData.geometry.coordinates[0][i][2];
            let distance = jsonData.geometry.coordinates[0][i][4];

            let time_diff_hour = (time-previousTime)/3600000;
            let verticalSpeed_m_per_h = (elevation-previousElevation)/time_diff_hour;
            if (isNaN(verticalSpeed_m_per_h))
                verticalSpeed_m_per_h = 0;
            let horizontalSpeed_km_per_h = ((distance-previousDistance)/1000)/(time_diff_hour);
            if (isNaN(horizontalSpeed_km_per_h))
                horizontalSpeed_km_per_h = 0;

            if ((time-previousTime)/1000 < (60) || Math.abs(elevation-previousElevation)>3) {
                movingTime += (time - previousTime);
                if (elevation-previousElevation > 0) {
                    verticalDistSumUp += (elevation-previousElevation);
                    verticalTimeSumUp += (time - previousTime);
                } else if (elevation-previousElevation < 0) {
                    verticalDistSumDown += (previousElevation-elevation);
                    verticalTimeSumDown += (time - previousTime);
                }
            }

            previousTime = time;
            previousElevation = elevation;
            previousDistance = distance;
            this.datas.push({'time' : time, 'altitude' : elevation, 'distance' : distance, 'vertical_speed' : verticalSpeed_m_per_h, 'horizontal_speed' : horizontalSpeed_km_per_h, 'moving_time' : movingTime});
        }

        this.horizontal_average = ((previousDistance)/(movingTime/3600));
        this.vertical_down_average = (verticalDistSumDown)/(verticalTimeSumDown/3600000);
        this.vertical_up_average = (verticalDistSumUp)/(verticalTimeSumUp/3600000);
        document.getElementById("value_horizontal_average").innerText=(this.horizontal_average*(this.metric?1:miles_per_km)).toFixed(1)+(this.metric?" km/h":" mph");
        document.getElementById("value_vertical_down_average").innerText=(this.vertical_down_average*(this.metric?1:feet_per_m)).toFixed(1)+(this.metric?" m/h":" ft/h");
        document.getElementById("value_vertical_up_average").innerText=(this.vertical_up_average*(this.metric?1:feet_per_m)).toFixed(1)+(this.metric?" m/h":" ft/h");

        this.maxAltitude = d3.max(this.datas, function(d) {return d.altitude});
        this.minAltitude = d3.min(this.datas, function(d) {return d.altitude});

        this.graph = new drawGraph(graphYAxis, graphXAxis);

        let movingTimeMinutes = movingTime/60000;
        document.getElementById("movingtime").innerText = Math.floor(movingTimeMinutes/60)+":"+Math.floor(movingTimeMinutes%60).toString().padStart(2,"0");
    }

    horizontal_average;
    vertical_down_average;
    vertical_up_average;
    maxAltitude = 5000;
    minAltitude = 0;

    changeGraphX(type) {
        this.graphXAxis = type;
        this.graph = new drawGraph(graphYAxis, graphXAxis);
    }

    changeGraphY(type) {
        this.graphYAxis = type;
        this.graph = new drawGraph(graphYAxis, graphXAxis);
    }

    drawGraph(yaxis, xaxis) {
        this.margingraph = {top: 10, right: 5, bottom: 25, left: 40};

        this.width = document.getElementById('graph').clientWidth-this.margingraph.left-this.margingraph.right;
        this.height = document.getElementById('graph').clientHeight-this.margingraph.top-this.margingraph.bottom;

        // append the svg object to the body of the page
        d3.select("#graph").select("svg").remove(); //clear if exists already
        this.svg = d3.select("#graph")
            .append("svg")
            .attr("width", this.width + this.margingraph.left + this.margingraph.right)
            .attr("height", this.height + this.margingraph.top + this.margingraph.bottom)
            .append("g")
            .attr("transform",
                "translate(" + this.margingraph.left + "," + this.margingraph.top + ")");

        this.yScale;
        this.xScale;
        this.functionpath = d3.line();

        this.regressionGenerator = d3.regressionLoess().bandwidth(0.03);

        switch (yaxis) {
            case GraphAxis.Elevation:
                document.getElementById("dropdowngraphyaxis").innerText = "Elevation";
                this.yScale = d3.scaleLinear().domain(d3.extent(this.datas, function(d) { return (d.altitude*(metric?1:feet_per_m)); }));
                this.functionpath.y((d) => { return this.yScale(d.altitude*(metric?1:feet_per_m)) });
                this.regressionGenerator.y(d => d.altitude*(metric?1:feet_per_m));
                break;
            case GraphAxis.Distance:
                document.getElementById("dropdowngraphyaxis").innerText = "Distance";
                this.yScale = d3.scaleLinear().domain(d3.extent(this.datas, function(d) { return (d.distance*(metric?1/1000:miles_per_km/1000)); }));
                this.functionpath.y((d) => {return this.yScale(d.distance*(metric?1/1000:miles_per_km/1000)) });
                this.regressionGenerator.y(d => d.distance*(metric?1/1000:miles_per_km/1000));
                break;
            case GraphAxis.VerticalSpeed:
                document.getElementById("dropdowngraphyaxis").innerText = "Vertical Speed";
                this.yScale = d3.scaleLinear().domain(d3.extent(this.datas, function(d) { return (d.vertical_speed*(metric?1:feet_per_m)); }));
                this.functionpath.y((d) => {return this.yScale(d.vertical_speed*(metric?1:feet_per_m)) });
                this.regressionGenerator.y(d => d.vertical_speed*(metric?1:feet_per_m));
                break;
            case GraphAxis.HorizontalSpeed:
                document.getElementById("dropdowngraphyaxis").innerText = "Horizontal Speed";
                this.yScale = d3.scaleLinear().domain(d3.extent(this.datas, function(d) { return (d.horizontal_speed*(metric?1:miles_per_km)); }));
                this.functionpath.y((d) => { return this.yScale(d.horizontal_speed*(metric?1:miles_per_km)) });
                this.regressionGenerator.y(d => d.horizontal_speed*(metric?1:miles_per_km));
                break;
            default:
                break;
        }

        switch (xaxis) {
            case GraphAxis.ElapsedTime:
                document.getElementById("dropdowngraphxaxis").innerText = "Elapsed time";
                this.xScale = d3.scaleTime().domain(d3.extent(this.datas, function(d) { return d.time; }));
                this.functionpath.x((d) => { return this.xScale(d.time) });
                this.regressionGenerator.x(d => d.time);
                break;
            case GraphAxis.Distance:
                document.getElementById("dropdowngraphxaxis").innerText = "Distance";
                this.xScale = d3.scaleLinear().domain(d3.extent(this.datas, function(d) { return (d.distance*(metric?1/1000:miles_per_km/1000)); }));
                this.functionpath.x((d) => { return this.xScale(d.distance*(metric?1/1000:miles_per_km/1000)) });
                this.regressionGenerator.x(d => d.distance*(metric?1/1000:miles_per_km/1000));
                break;
            case GraphAxis.MovingTime:
                document.getElementById("dropdowngraphxaxis").innerText = "Moving Time";
                this.xScale = d3.scaleTime().domain(d3.extent(this.datas, function(d) { return d.moving_time; }));
                this.functionpath.x((d) => { return this.xScale(d.moving_time) });
                this.regressionGenerator.x(d => d.moving_time);
                break;
            default:
                break
        }

        this.xAxisLabel = d3.axisBottom(this.xScale);
        this.yAxisLabel = d3.axisLeft(this.yScale);

        this.yScale.range([this.height,0]);
        this.xScale.range([0, this.width]);

        if (xaxis === GraphAxis.MovingTime) {
            this.xAxisLabel.tickFormat(d3.utcFormat("%H:%M"));
        }

        this.svg.append("g")
            .attr("transform", "translate(0," + this.height + ")")
            .attr("class","myXaxis")
            .call(this.xAxisLabel);

        this.svg.append("g")
            .attr("class","myYaxis")
            .call(this.yAxisLabel);

        this.svg.append("path")
            .datum(this.datas)
            .attr("fill", "none")
            .attr("stroke", "#ff8001")
            .attr("stroke-width", 2)
            .attr("class", "datapath")
            .attr("d", this.functionpath)

        if (yaxis === GraphAxis.VerticalSpeed) {
            this.areaUp = d3.area()
                .y0(this.yScale(0))
                .y1((d) => { if (d.vertical_speed>0) {return this.yScale(d.vertical_speed*(metric?1:feet_per_m))}else{return this.yScale(0);}});

            this.areaDown = d3.area()
                .y0(this.yScale(0))
                .y1((d) => { if (d.vertical_speed<0) {return this.yScale(d.vertical_speed*(metric?1:feet_per_m))}else{return this.yScale(0);}});


            switch (xaxis) {
                case GraphAxis.MovingTime:
                    this.areaUp.x((d) => { return this.xScale(d.moving_time); })
                    this.areaDown.x((d) => { return this.xScale(d.moving_time); })
                    break;
                case GraphAxis.ElapsedTime:
                    this.areaUp.x((d) => { return this.xScale(d.time); })
                    this.areaDown.x((d) => { return this.xScale(d.time); })
                    break;
                case GraphAxis.Distance:
                    this.areaUp.x((d) => { return this.xScale(d.distance*(metric?1/1000:miles_per_km/1000)); })
                    this.areaDown.x((d) => { return this.xScale(d.distance*(metric?1/1000:miles_per_km/1000)); })
                    break;
            }

            this.svg.append("path")
                .datum(this.datas)
                .attr("class","areaUp")
                .attr("fill", "#ffd3fe")
                .attr("d", this.areaUp)

            this.svg.append("path")
                .datum(this.datas)
                .attr("class","areaUp")
                .attr("fill", "#caf6b9")
                .attr("d", this.areaDown)
        }

        if (yaxis === GraphAxis.HorizontalSpeed || yaxis === GraphAxis.VerticalSpeed) {
            this.regressionpath = d3.line()
                .x(d => this.xScale(d[0]))
                .y(d => this.yScale(d[1]));

            d3.select(".datapath")
                .attr("stroke", "rgb(126,126,126)")
                .attr("stroke-width", 1);

            this.svg.append("path")
                .datum(this.regressionGenerator(this.datas))
                .attr("class","graphregression")
                .attr("fill", "none")
                .attr("stroke", "#ff8001")
                .attr("stroke-width", 2)
                .attr("d", this.regressionpath)
        }

        // This allows to find the closest X index of the mouse:
        this.bisect;
        switch (xaxis) {
            case GraphAxis.MovingTime:
                this.bisect = d3.bisector(function(d) { return d.moving_time; }).left;
                break;
            case GraphAxis.ElapsedTime:
                this.bisect = d3.bisector(function(d) { return d.time; }).left;
                break;
            case GraphAxis.Distance:
                this.bisect = d3.bisector(function(d) { return (d.distance*(metric?1/1000:miles_per_km/1000)); }).left;
                break;
        }
        // Create the circle that travels along the curve of chart
        this.focus = this.svg
            .append('g')
            .append('circle')
            .style("fill", "rgba(68,146,220,0.42)")
            .attr("stroke", "none")
            .attr('r', 8.5)
            .style("opacity", 0)

        // Create the text that travels along the curve of chart
        this.xfocusText = this.svg
            .append('g')
            .append('text')
            .style("opacity", 0)
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle")
        this.yfocusText = this.svg
            .append('g')
            .append('text')
            .style("opacity", 0)
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle")

        // What happens when the mouse move -> show the annotations at the right positions.

        var that = this;

        this.showGraphMarker = function(){
            that.focus.style("opacity", 1)
            that.xfocusText.style("opacity",1)
            that.yfocusText.style("opacity",1)
        }

        this.mouseover = function(){
            that.showGraphMarker();
        }

        this.mousemove = function() {
            // recover coordinate we need
            var x0 = that.xScale.invert(d3.pointer(event, this)[0]);
            var i = that.bisect(this.datas, x0, 1);
            var selectedData = this.datas[i]
            if (selectedData=== undefined)
                return;

            that.moveGraphMarker(selectedData);
            moveMapMarker(jsonData.geometry.coordinates[0][i][1], jsonData.geometry.coordinates[0][i][0]);
        }

        this.moveGraphMarker = function(selectedData) {
            this.xtext;
            this.ytext
            this.xdata;
            this.ydata;

            switch (xaxis) {
                case GraphAxis.MovingTime:
                    this.xdata = selectedData.moving_time;
                    this.xtext = d3.utcFormat("%H:%M")(that.xdata) + " h";
                    break;
                case GraphAxis.ElapsedTime:
                    this.xdata = selectedData.time;
                    this.xtext = d3.timeFormat("%H:%M")(that.xdata);
                    break;
                case GraphAxis.Distance:
                    this.xdata = (selectedData.distance*(metric?1/1000:miles_per_km/1000));
                    this.xtext = (that.xdata).toFixed(2) + (metric?" km":" mi");
                    break;
            }

            switch (yaxis) {
                case GraphAxis.Distance:
                    this.ydata = (selectedData.distance*(metric?1/1000:miles_per_km/1000));
                    this.ytext = (that.ydata).toFixed(2) + (metric?" km":" mi");
                    break;
                case GraphAxis.Elevation:
                    this.ydata = (selectedData.altitude*(metric?1:feet_per_m));
                    this.ytext = that.ydata.toFixed(0) + (metric?" m":" ft");
                    break;
                case GraphAxis.VerticalSpeed:
                    this.ydata = (selectedData.vertical_speed*(metric?1:feet_per_m));
                    this.ytext = that.ydata.toFixed(1) + (metric?" m/h":" ft/h");
                    break;
                case GraphAxis.HorizontalSpeed:
                    this.ydata = (selectedData.horizontal_speed*(metric?1:miles_per_km));
                    this.ytext = that.ydata.toFixed(1) + (metric?" km/h":" mph");
                    break;
            }

            that.focus
                .attr("cx", that.xScale(this.xdata))
                .attr("cy", that.yScale(this.ydata))
            that.xfocusText
                .html(this.xtext)
                .attr("x", that.xScale(this.xdata)+15)
                .attr("y", that.yScale(this.ydata))
            that.yfocusText
                .html(this.ytext)
                .attr("x", that.xScale(this.xdata)+15)
                .attr("y", that.yScale(this.ydata)+15)
        }

        this.hideGraphMarker = function() {
            that.focus.style("opacity", 0)
            that.xfocusText.style("opacity", 0)
            that.yfocusText.style("opacity", 0);
        }

        this.mouseout = function() {
            that.hideGraphMarker();
            hideMapMarker();
        }

        // Create a rect on top of the svg area: this rectangle recovers mouse position
        this.svg
            .append('rect')
            .style("fill", "none")
            .style("pointer-events", "all")
            .attr('width', this.width)
            .attr('height', this.height)
            .on('mouseover', this.mouseover)
            .on('mousemove', this.mousemove)
            .on('mouseout', this.mouseout);
    }
}

class GraphAxis {
    // Create new instances of the same class as static attributes
    static Elevation = new GraphAxis("elevation");
    static ElapsedTime = new GraphAxis("elapsed_time");
    static MovingTime = new GraphAxis("moving_time");
    static Distance = new GraphAxis("distance");
    static HorizontalSpeed = new GraphAxis("horizontal_speed");
    static VerticalSpeed = new GraphAxis("vertical_speed");

    constructor(name) {
        this.name = name
    }
}