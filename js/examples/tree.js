$(function(){
  // using build in event bus
  // http://lostechies.com/derickbailey/2011/07/19/references-routing-and-the-event-aggregator-coordinating-views-in-backbone-js/
  var vent = _.extend({}, Backbone.Events);

  // var base_url = 'http://localhost:8000/api';
  var base_url = 'https://ecoengine.berkeley.edu/api';

  // my helpers
  var _get_name = function(name) {
        var new_name = ''
        var pieces = name.split('/')
        while (new_name == '') {
            new_name = pieces.pop()
        }
    return new_name
  }

  var _get_or_create_obj = function(name, array) {
    // checks whether an item exists in an array of objects.
    var ret
    if (name) {
        name = _get_name(name)
        array.forEach(function(item) {
            if (item.name === name) {
                ret = item;
            }
        });
        if (!ret) {
                ret = {"name": name, "children": []};
                array.push(ret);
            }
        return ret;
    }
    return null
  }

  var _reformat = function(json) {
    var tree_data = {"name": "life", "children": []};
    json.forEach(function(jsn){
        var obj = _get_or_create_obj(jsn.kingdom, tree_data.children)
        var levels = [jsn.phylum, jsn.clss, jsn.order, jsn.family, jsn.genus, jsn.specific_epithet]
        levels.forEach(function(level) {
            if (obj) {
                obj = _get_or_create_obj(level, obj.children)
            }
        });
    });
    return tree_data;
  }
  // end my helpers

  // D3 objects
  function D3Obj(o) {
    // unlink reference to object and create copy instead
    // http://stackoverflow.com/questions/5364650/cloning-an-object-in-javascript
    var data = $.extend({}, o.data);
    // TODO: cleaner deal with event object
    var m = [20, 50, 20, 120],
    w = 1280 - m[1] - m[3],
    h = 800 - m[0] - m[2],
    i = 0,
    root;
    var tree = d3.layout.tree()
      .size([h, w]);
    var diagonal = d3.svg.diagonal()
      .projection(function(d) { return [d.y, d.x]; });
    var vis = d3.select(o.selector).append("svg:svg")
      .attr("width", w + m[1] + m[3])
      .attr("height", h + m[0] + m[2])
    .append("svg:g")
      .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

    root = data;
    root.x0 = h / 2;
    root.y0 = 0;

    function toggleAll(d) {
      if (d.children) {
        d.children.forEach(toggleAll);
        toggle(d);
      }
    }

    function update(source) {
      var duration = d3.event && d3.event.altKey ? 5000 : 500;
      // Compute the new tree layout.
      var nodes = tree.nodes(root).reverse();
      // Normalize for fixed-depth.
      nodes.forEach(function(d) {
        d.y = d.depth * 100;
      });

      // Update the nodes ...
      var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("svg:g")
        .attr("class", "node")
        .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        .on("click", function(d) { toggle(d); update(d); });

      nodeEnter.append("svg:circle")
        .attr("r", 1e-6)
        .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeEnter.append("svg:text")
        .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
        .attr("dy", ".35em")
        .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
        .text(function(d) { return d.name; })
        .style("fill-opacity", 1e-6);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
        .attr("r", 4.5)
        .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeUpdate.select("text")
        .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .remove();

      nodeExit.select("circle")
        .attr("r", 1e-6);

      nodeExit.select("text")
        .style("fill-opacity", 1e-6);

      // Update the links…
      var link = vis.selectAll("path.link")
        .data(tree.links(nodes), function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
          var o = {x: source.x0, y: source.y0};
          return diagonal({source: o, target: o});
      })
        .transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
          var o = {x: source.x, y: source.y};
          return diagonal({source: o, target: o});
        })
        .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    };

    // Toggle children.
    function toggle(d) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    }
    update(root);

  };
  // end D3 objects

  // Backbone models
  var Reserve = Backbone.Model.extend([]);
  var List = Backbone.Model.extend([]);
  var TreeData = Backbone.Model.extend({
    url_fragment: base_url + '/observations/?page_size=0&fields=kingdom,phylum,order,clss,family,genus,specific_epithet&record=',
    initialize: function(options){
      // ensures the focus for the update method
      _.bindAll(this, "update");
      options.vent.bind("list_selected", this.update);
      options.vent.bind("reserve_selected", this.update);
    },
    update: function(e) {
      this.url = ''.concat(this.url_fragment, $("option:selected", e.target).attr('value'), ":");
      this.fetch({reset:true})
    },
    parse: function(response) {
      var data = _reformat(response.results);
      return data;
    }
  });
  // end Backbone models

  // Backbone Collections
  var ReservesList = Backbone.Collection.extend({
    model: Reserve,
    url: base_url + '/footprints/?page_size=0&fields=name',
    comparator: function(reserve) {
      return reserve.get("name")
    },
    initialize: function() {
      this.fetch({reset: true});
    },
    parse: function(response) {
      return response.results;
    },
  });


  var ListsList = Backbone.Collection.extend({
    model: List,
    url_fragment: base_url + '/checklists/?page_size=0&fields=subject,record&footprint=',
    comparator: function(list) {
      return list.get('subject')
    },
    // TODO: extend parent class to not repeat this in every collection/view?
    initialize: function(options){
    // ensures the focus for the update method
    _.bindAll(this, "update");
    options.vent.bind("reserve_selected", this.update);
    },
    update: function(e) {
      this.url = this.url_fragment + $("option:selected", e.target).attr('value');
      this.fetch({reset: true});
    },
    parse: function(response) {
      return response.results;
    }

  });

  var TreeDataList = Backbone.Collection.extend({
    model: TreeData,
  })

  var reserves = new ReservesList();
  var lists = new ListsList({vent: vent});
  var datas = new TreeDataList({vent: vent});
  // end Collections

  // Backbone Views
  var ReservesView = Backbone.View.extend({
    el: $('#reserve_selector_container'),
    template: _.template($("#reserve_select_template").html()),
    events: {
      'change #reserve_selector': 'clicked'
    },
    initialize: function(options) {
      this.vent = options.vent;
      this.render()
      this.listenTo(reserves, 'reset', this.render);
    },
    clicked: function(e) {
      this.vent.trigger("reserve_selected", e);
    },
    render: function() {
      this.$el.html(
        this.template({
          reserves: reserves.toJSON()
        })
      );
      return this;
    }
  });


  var ListsView = Backbone.View.extend({
    el: $('#list_selector_container'),
    template: _.template($("#list_select_template").html()),
    events: {
      'change #list_selector': 'clicked'
    },
    initialize: function(options) {
       this.vent = options.vent;
       this.render();
       this.listenTo(lists, 'reset, this.render');
    },
    clicked: function(e) {
      this.vent.trigger("list_selected", e);
    },
    render: function() {
      this.$el.html(
        this.template({
          lists: lists.toJSON()
        })
      );
      return this;
    },
  })


  var D3GraphView = Backbone.View.extend({
    tagName: 'div',
    // TODO: figure out Backbone selectors
    render: function() {
      graph = new D3Obj({
        selector: '#tree',
        data: this.model.attributes
      });
      return this;
    }
  })


  var App = Backbone.View.extend({
    el: $('#main'),
    initialize: function() {
      var reservesview = new ReservesView({ vent: vent });
      this.lists_selector = $('#lists_selector');
      this.tree_selector = $('#tree');
      this.listenTo(lists, 'reset', this.render);
      this.listenTo(datas, 'change', this.render_tree);
    },
    render: function(){
      var listsview = new ListsView({ vent: vent });
      return this;
    },
    render_tree: function() {
      // initialize D3 graph pane
      this.tree_selector.html('');
      datas.each(function(dta) {
        var view = new D3GraphView({ model: dta, vent: vent });
        this.tree_selector.append(view.render().el)
      }, this);
      return this;
    }
  });


  new App();
  // end Views

})
