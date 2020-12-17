/*jshint multistr: true */
'use strict';
var holos = {
    // configuration variables, TODO: breakout later
    ds_url: '../../static/ipt.txt',
    // name-spaced utility functions,
    // TODO: delete once json has the right structure
    __: {

        groupBy: function (collection) {
            var institutions = [],
                list = [];
            $.each(collection.data, function (index, value) {
                var idx = $.inArray(value.institution, institutions);
                if (idx === -1) {
                    institutions.push(value.institution);
                    list.push({
                        "name": value.institution,
                        "desc": value.institutionDescription,
                        "dataSets": [value.name],
                        "url": value.onlineURL
                    });
                } else {
                    list[idx].dataSets.push(value.name);
                }
            });
	    // now alphabetize insitutions, "list" is an array of objects
	    // http://www.javascriptkit.com/javatutors/arraysort2.shtml
	    list.sort(function(a, b){
	        var nameA=a.name.toLowerCase(), nameB=b.name.toLowerCase()
	        if (nameA < nameB) //sort string ascending
		    return -1
                if (nameA > nameB)
		    return 1
                return 0 //default return value (no sorting)
	   });
            return {data: list};
        },

        reformat_datasets: function (yoshis_data) {
            var list = [], key, obj, attrname;
            for (key in yoshis_data) {
                obj = {};
                for (attrname in yoshis_data[key]) {
                    obj[attrname] = yoshis_data[key][attrname];
                }
                list.push(obj);
            }
            return {data: list};
        },

        reformat_institutions: function (yoshis_data) {
            var data = holos.__.reformat_datasets(yoshis_data);
            return holos.__.groupBy(data);
        }
    },

    // initialize front page map, only used once
    frontpagemap: {
        init: function () {
            var map = L.map('map').setView([37, -121], 6);
            L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }
    },

    // create this as prototype since it is used in at least two contexts
    List: function (selector, url, transform, template) {
        // make this available to children
        this.service = function () {
            var that = this;
            d3.json(url, function (error, data) {
                if (error) return console.warn(error);
                data = transform(data);
                that.update(data);
            });
        };
        this.init = function () {
            d3.select(selector).append('table');
            this.service(url);
        };
        this.update = function (data) {
            var that = this;
            var rows = d3.select(selector + ' table').selectAll('tr')
                .data(data.data);
            rows.enter().append('tr');
            rows.html(function (d) {
                return Mustache.to_html(template, d);
            });
            rows.exit().remove();
        };
    },
};

holos.datasources = new holos.List('#datasources', holos.ds_url, holos.__.reformat_datasets,
    ' \
        <tr><td><table style="min-width: 100%;"> \
        <colgroup> \
            <col span="1" style="width: 20%;"> \
            <col span="1" style="width: 80%;"> \
        </colgroup> \
        <tr><h4>{{ name }}</h4></tr> \
        <tr><th>&nbsp;</th><td>&nbsp;</td></tr> \
        <tr><th>Description</th><td>{{ desc }}</td></tr> \
	{{ #retrieval }}<tr><th>Last Retrieved</th><td>{{ retrieval }}</td></tr>{{ /retrieval }} \
        <tr><th></th><td>&nbsp;</td></tr> \
        <tr><th>Geographic Extent</th><td><u>{{ geographicExtentCoord }}</u> <br>{{ geographicExtentDesc }}</td></tr> \
        {{ #taxonomicExtent }}{{ #taxonomicExtentDesc }}<tr><th>Taxonomic Extent</th><td><u>{{ taxonomicExtent }}</u> <br> {{ taxonomicExtentDesc }}</td></tr>{{ /taxonomicExtentDesc }}{{ /taxonomicExtent }} \
{{ #taxonomicExtent }}{{ ^taxonomicExtentDesc }}<tr><th>Taxonomic Extent</th><td><u>{{ taxonomicExtent }}</u></td></tr>{{ /taxonomicExtentDesc }}{{ /taxonomicExtent }} \
{{ ^taxonomicExtent }}{{ #taxonomicExtentDesc }}<tr><th>Taxonomic Extent</th><td>{{ taxonomicExtentDesc }}</td></tr>{{ /taxonomicExtentDesc }}{{ /taxonomicExtent }} \
        {{ #temporal }}<tr><th>Temporal Extent</th><td><u>{{ temporal }}</u></td></tr>{{ /temporal }} \
        <tr><th></th><td>&nbsp;</td></tr> \
        {{ #metadata }}<tr><th>Metadata Source</th><td><a href="{{ metadata }}">{{ metadata }}</a></td></tr>{{ /metadata }} \
        {{ #onlineURL }}<tr><th>External Link</th><td><a href="{{ onlineURL }}">{{ onlineURL }}</a></td></tr>{{ /onlineURL }} \
        <tr><th>Affiliate Institution</th><td>{{ institution }}</td></tr> \
        <tr><th>Contact</th><td>{{ contact.individualName.givenName }} {{ contact.individualName.surName }}</td></tr> \
        <tr><th></th><td>{{ contact.positionName }}</td></tr> \
        <tr><th></th><td>{{ contact.address.deliveryPoint }}</td></tr> \
        <tr><th></th><td>{{ contact.address.city }}, {{ contact.address.administrativeArea }} {{ contact.address.postalCode }} </td></tr> \
        <tr><th></th><td>{{ contact.electronicMailAddress }}</td></tr> \
        <tr><th></th><td>{{ contact.phone }}</td></tr> \
        <tr><th></th><td>&nbsp;</td></tr> \
        </table></td></tr>'
);

holos.institutions = new holos.List('#institutions', holos.ds_url, holos.__.reformat_institutions,
    ' \
        <tr><td><table style="min-width: 100%;"> \
        <colgroup> \
            <col span="1" style="width: 20%;"> \
            <col span="1" style="width: 80%;"> \
        </colgroup> \
        {{ #url }}<tr><td colspan="2"><h4><a href="{{ url }}">{{ name }}<a></h4></td></tr>{{ /url }} \
        {{ ^url }}<tr><td colspan="2"><h4>{{ name }}</h4></td></tr>{{ /url }} \
        <tr><th>Datasets</th><td>{{ #dataSets }}<ul>{{ . }}</ul>{{ /dataSets }}</td></tr> \
        <tr><th></th><td>&nbsp;</td></tr> \
        </table></td></tr>'
);
