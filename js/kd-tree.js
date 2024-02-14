/**
 * k-d Tree JavaScript  *
 * Adapted for cubetrek from https://github.com/ubilabs/kd-tree-javascript
 */
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['exports'], factory);
    } else if (typeof exports === 'object') {
        factory(exports);
    } else {
        factory(root);
    }
}(this, function (exports) {
    function Node(obj, dimension, parent) {
        this.obj = obj;
        this.left = null;
        this.right = null;
        this.parent = parent;
        this.dimension = dimension;
    }

    var distance = function(a, b){
        //Euclidean instead of Haversine distance is good enough
        return Math.pow(a[0] - b[0], 2) +  Math.pow(a[1] - b[1], 2);
    }

    function kdTree(points_in) {
        var points = [...points_in]; //shallow copy to modify
        var metric = distance;

        var self = this;

        function buildTree(points, depth, parent) {
            var dim = depth % 2,
                median,
                node;

            if (points.length === 0) {
                return null;
            }
            if (points.length === 1) {
                return new Node(points[0], dim, parent);
            }

            points.sort(function (a, b) {
                return a[dim] - b[dim];
            });

            median = Math.floor(points.length / 2);
            node = new Node(points[median], dim, parent);
            node.left = buildTree(points.slice(0, median), depth + 1, node);
            node.right = buildTree(points.slice(median + 1), depth + 1, node);

            return node;
        }

        this.root = buildTree(points, 0, null);

        this.nearest = function (point, maxNodes, maxDistance) {
            var i,
                result,
                bestNodes;

            bestNodes = new BinaryHeap(
                function (e) { return -e[1]; }
            );

            function nearestSearch(node) {
                var bestChild,
                    dimension = node.dimension,
                    ownDistance = metric(point, node.obj),
                    linearPoint = {},
                    linearDistance,
                    otherChild,
                    i;

                function saveNode(node, distance) {
                    bestNodes.push([node, distance]);
                    if (bestNodes.size() > maxNodes) {
                        bestNodes.pop();
                    }
                }

                for (i = 0; i < 2; i += 1) {
                    if (i === node.dimension) {
                        linearPoint[i] = point[i];
                    } else {
                        linearPoint[i] = node.obj[i];
                    }
                }

                linearDistance = metric(linearPoint, node.obj);

                if (node.right === null && node.left === null) {
                    if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
                        saveNode(node, ownDistance);
                    }
                    return;
                }

                if (node.right === null) {
                    bestChild = node.left;
                } else if (node.left === null) {
                    bestChild = node.right;
                } else {
                    if (point[dimension] < node.obj[dimension]) {
                        bestChild = node.left;
                    } else {
                        bestChild = node.right;
                    }
                }

                nearestSearch(bestChild);

                if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
                    saveNode(node, ownDistance);
                }

                if (bestNodes.size() < maxNodes || Math.abs(linearDistance) < bestNodes.peek()[1]) {
                    if (bestChild === node.left) {
                        otherChild = node.right;
                    } else {
                        otherChild = node.left;
                    }
                    if (otherChild !== null) {
                        nearestSearch(otherChild);
                    }
                }
            }

            if (maxDistance) {
                for (i = 0; i < maxNodes; i += 1) {
                    bestNodes.push([null, maxDistance]);
                }
            }

            if(self.root)
                nearestSearch(self.root);

            result = [];

            for (i = 0; i < Math.min(maxNodes, bestNodes.content.length); i += 1) {
                if (bestNodes.content[i][0]) {
                    result.push([bestNodes.content[i][0].obj, bestNodes.content[i][1]]);
                }
            }
            return result;
        };

        this.balanceFactor = function () {
            function height(node) {
                if (node === null) {
                    return 0;
                }
                return Math.max(height(node.left), height(node.right)) + 1;
            }

            function count(node) {
                if (node === null) {
                    return 0;
                }
                return count(node.left) + count(node.right) + 1;
            }

            return height(self.root) / (Math.log(count(self.root)) / Math.log(2));
        };
    }

    // Binary heap implementation from:
    // http://eloquentjavascript.net/appendix2.html

    function BinaryHeap(scoreFunction){
        this.content = [];
        this.scoreFunction = scoreFunction;
    }

    BinaryHeap.prototype = {
        push: function(element) {
            // Add the new element to the end of the array.
            this.content.push(element);
            // Allow it to bubble up.
            this.bubbleUp(this.content.length - 1);
        },

        pop: function() {
            // Store the first element so we can return it later.
            var result = this.content[0];
            // Get the element at the end of the array.
            var end = this.content.pop();
            // If there are any elements left, put the end element at the
            // start, and let it sink down.
            if (this.content.length > 0) {
                this.content[0] = end;
                this.sinkDown(0);
            }
            return result;
        },

        peek: function() {
            return this.content[0];
        },

        remove: function(node) {
            var len = this.content.length;
            // To remove a value, we must search through the array to find
            // it.
            for (var i = 0; i < len; i++) {
                if (this.content[i] == node) {
                    // When it is found, the process seen in 'pop' is repeated
                    // to fill up the hole.
                    var end = this.content.pop();
                    if (i != len - 1) {
                        this.content[i] = end;
                        if (this.scoreFunction(end) < this.scoreFunction(node))
                            this.bubbleUp(i);
                        else
                            this.sinkDown(i);
                    }
                    return;
                }
            }
            throw new Error("Node not found.");
        },

        size: function() {
            return this.content.length;
        },

        bubbleUp: function(n) {
            // Fetch the element that has to be moved.
            var element = this.content[n];
            // When at 0, an element can not go up any further.
            while (n > 0) {
                // Compute the parent element's index, and fetch it.
                var parentN = Math.floor((n + 1) / 2) - 1,
                    parent = this.content[parentN];
                // Swap the elements if the parent is greater.
                if (this.scoreFunction(element) < this.scoreFunction(parent)) {
                    this.content[parentN] = element;
                    this.content[n] = parent;
                    // Update 'n' to continue at the new position.
                    n = parentN;
                }
                // Found a parent that is less, no need to move it further.
                else {
                    break;
                }
            }
        },

        sinkDown: function(n) {
            // Look up the target element and its score.
            var length = this.content.length,
                element = this.content[n],
                elemScore = this.scoreFunction(element);

            while(true) {
                // Compute the indices of the child elements.
                var child2N = (n + 1) * 2, child1N = child2N - 1;
                // This is used to store the new position of the element,
                // if any.
                var swap = null;
                // If the first child exists (is inside the array)...
                if (child1N < length) {
                    // Look it up and compute its score.
                    var child1 = this.content[child1N],
                        child1Score = this.scoreFunction(child1);
                    // If the score is less than our element's, we need to swap.
                    if (child1Score < elemScore)
                        swap = child1N;
                }
                // Do the same checks for the other child.
                if (child2N < length) {
                    var child2 = this.content[child2N],
                        child2Score = this.scoreFunction(child2);
                    if (child2Score < (swap == null ? elemScore : child1Score)){
                        swap = child2N;
                    }
                }

                // If the element needs to be moved, swap it, and continue.
                if (swap != null) {
                    this.content[n] = this.content[swap];
                    this.content[swap] = element;
                    n = swap;
                }
                // Otherwise, we are done.
                else {
                    break;
                }
            }
        }
    };

    exports.kdTree = kdTree;
    exports.BinaryHeap = BinaryHeap;
}));
