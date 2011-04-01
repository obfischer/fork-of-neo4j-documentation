(function() {
  /*
  Renderer, forked from the halfviz library.
  */  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  define(['order!lib/jquery', 'order!lib/arbor', 'order!lib/arbor-graphics', 'order!lib/arbor-tween', 'order!lib/backbone'], function() {
    var Renderer;
    return Renderer = (function() {
      function Renderer(canvas, labelFactory) {
        this.labelFactory = labelFactory;
        this.intersect_line_box = __bind(this.intersect_line_box, this);;
        this.intersect_line_line = __bind(this.intersect_line_line, this);;
        this.thesePointsAreReallyClose = __bind(this.thesePointsAreReallyClose, this);;
        this.nodeDropped = __bind(this.nodeDropped, this);;
        this.nodeDragged = __bind(this.nodeDragged, this);;
        this.clicked = __bind(this.clicked, this);;
        this.initMouseHandling = __bind(this.initMouseHandling, this);;
        this.renderEdge = __bind(this.renderEdge, this);;
        this.renderNode = __bind(this.renderNode, this);;
        this.redraw = __bind(this.redraw, this);;
        this.init = __bind(this.init, this);;
        this.canvas = $(canvas).get(0);
        this.ctx = this.canvas.getContext("2d");
        this.gfx = arbor.Graphics(this.canvas);
        _.extend(this, Backbone.Events);
      }
      Renderer.prototype.init = function(system) {
        this.particleSystem = system;
        this.particleSystem.screenSize(this.canvas.width, this.canvas.height);
        this.particleSystem.screenPadding(40);
        return this.initMouseHandling();
      };
      Renderer.prototype.redraw = function() {
        if (!this.particleSystem) {
          return;
        }
        this.gfx.clear();
        this.nodeBoxes = {};
        this.particleSystem.eachNode(this.renderNode);
        this.particleSystem.eachEdge(this.renderEdge);
        return this.nodeBoxes = {};
      };
      Renderer.prototype.renderNode = function(node, pt) {
        var label, nodeStyle, w;
        if (node.data.fixated) {
          node.fixed = true;
        }
        label = this.labelFactory.getLabelFor(node);
        w = this.ctx.measureText("" + label).width + 10;
        if (!("" + label).match(/^[ \t]*$/)) {
          pt.x = Math.floor(pt.x);
          pt.y = Math.floor(pt.y);
        } else {
          label = null;
        }
        nodeStyle = {
          fill: node.data.color || "#000000",
          alpha: node.data.alpha || 0.2
        };
        if (node.data.shape === 'dot') {
          this.gfx.oval(pt.x - w / 2, pt.y - w / 2, w, w, nodeStyle);
          this.nodeBoxes[node.name] = [pt.x - w / 2, pt.y - w / 2, w, w];
        } else {
          this.gfx.rect(pt.x - w / 2, pt.y - 10, w, 20, 4, nodeStyle);
          this.nodeBoxes[node.name] = [pt.x - w / 2, pt.y - 11, w, 22];
        }
        if (label) {
          this.ctx.font = "12px Helvetica";
          this.ctx.textAlign = "center";
          this.ctx.fillStyle = "white";
          if (node.data.color === 'none') {
            this.ctx.fillStyle = '#333333';
          }
          this.ctx.fillText(label || "", pt.x, pt.y + 4);
          return this.ctx.fillText(label || "", pt.x, pt.y + 4);
        }
      };
      Renderer.prototype.renderEdge = function(edge, pt1, pt2) {
        var arrowLength, arrowWidth, color, head, tail, weight, wt;
        weight = edge.data.weight;
        color = edge.data.color;
        color = (color != null) && !("" + color).match(/^[ \t]*$/) ? color : "#cccccc";
        tail = this.intersect_line_box(pt1, pt2, this.nodeBoxes[edge.source.name]);
        head = this.intersect_line_box(tail, pt2, this.nodeBoxes[edge.target.name]);
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.lineWidth = !isNaN(weight) ? parseFloat(weight) : 1;
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = "rgba(0, 0, 0, 0)";
        this.ctx.moveTo(tail.x, tail.y);
        this.ctx.lineTo(head.x, head.y);
        this.ctx.stroke();
        this.ctx.restore();
        if (edge.data.directed) {
          this.ctx.save();
          wt = !isNaN(weight) ? parseFloat(weight) : 1;
          arrowLength = 6 + wt;
          arrowWidth = 2 + wt;
          this.ctx.fillStyle = color;
          this.ctx.translate(head.x, head.y);
          this.ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));
          this.ctx.clearRect(-arrowLength / 2, -wt / 2, arrowLength / 2, wt);
          this.ctx.beginPath();
          this.ctx.moveTo(-arrowLength, arrowWidth);
          this.ctx.lineTo(0, 0);
          this.ctx.lineTo(-arrowLength, -arrowWidth);
          this.ctx.lineTo(-arrowLength * 0.8, -0);
          this.ctx.closePath();
          this.ctx.fill();
          return this.ctx.restore();
        }
      };
      Renderer.prototype.initMouseHandling = function() {
        this.selected = null;
        this.nearest = null;
        this.dragged = null;
        return $(this.canvas).mousedown(this.clicked);
      };
      Renderer.prototype.clicked = function(e) {
        var p, pos;
        pos = $(this.canvas).offset();
        this.dragStart = {
          x: e.pageX,
          y: e.pageY
        };
        p = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
        this.selected = this.nearest = this.dragged = this.particleSystem.nearest(p);
        if (this.dragged.node != null) {
          this.dragged.node.fixed = true;
        }
        $(this.canvas).bind('mousemove', this.nodeDragged);
        $(window).bind('mouseup', this.nodeDropped);
        return false;
      };
      Renderer.prototype.nodeDragged = function(e) {
        var old_nearest, p, pos, s;
        old_nearest = this.nearest && this.nearest.node._id;
        pos = $(this.canvas).offset();
        s = arbor.Point(e.pageX - pos.left, e.pageY - pos.top);
        if (!this.nearest) {
          return;
        }
        if (this.dragged !== null && this.dragged.node !== null) {
          p = this.particleSystem.fromScreen(s);
          this.dragged.node.p = p;
        }
        return false;
      };
      Renderer.prototype.nodeDropped = function(e) {
        if (this.dragged === null || this.dragged.node === void 0) {
          return;
        }
        if (this.dragged.node !== null) {
          this.dragged.node.fixed = this.dragged.node.data.fixated;
        }
        this.dragged.node.tempMass = 1000;
        if (this.dragged.node !== null && this.thesePointsAreReallyClose(this.dragStart, {
          x: e.pageX,
          y: e.pageY
        })) {
          this.trigger("node:click", this.dragged.node);
        }
        this.dragged = null;
        this.selected = null;
        $(this.canvas).unbind('mousemove', this.nodeDragged);
        $(window).unbind('mouseup', this.nodeDropped);
        return false;
      };
      Renderer.prototype.thesePointsAreReallyClose = function(p1, p2) {
        return Math.abs(p1.x - p2.x) < 5 && Math.abs(p1.y - p2.y) < 5;
      };
      Renderer.prototype.intersect_line_line = function(p1, p2, p3, p4) {
        var denom, ua, ub;
        denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        if (denom === 0) {
          return false;
        }
        ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;
        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
          return false;
        } else {
          return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
        }
      };
      Renderer.prototype.intersect_line_box = function(p1, p2, boxTuple) {
        var bl, br, h, p3, tl, tr, w;
        p3 = {
          x: boxTuple[0],
          y: boxTuple[1]
        };
        w = boxTuple[2];
        h = boxTuple[3];
        tl = {
          x: p3.x,
          y: p3.y
        };
        tr = {
          x: p3.x + w,
          y: p3.y
        };
        bl = {
          x: p3.x,
          y: p3.y + h
        };
        br = {
          x: p3.x + w,
          y: p3.y + h
        };
        return this.intersect_line_line(p1, p2, tl, tr) || this.intersect_line_line(p1, p2, tr, br) || this.intersect_line_line(p1, p2, br, bl) || this.intersect_line_line(p1, p2, bl, tl) || false;
      };
      return Renderer;
    })();
  });
}).call(this);
