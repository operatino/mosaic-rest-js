(function(window){


    function extend() {
	var i, j, a = arguments;
	for (i = 1; i < a.length; i++) {
	    for (j in a[i]) a[0][j] = a[i][j];
	}
	return a[0];
    }

    function BBRest(cnf) {
	this.config = extend({
	    host: 'localhost',
	    port: '7777',
	    context: 'portalserver',
	    username: 'admin',
	    password: 'admin',
	    portal: null
	}, cnf || {});
    }

    extend(BBRest.prototype, {
	server: function(isCatalog, itemName) {
	    var a = [isCatalog? 'catalog' : 'portals'];
	    if (itemName) a.push(itemName);
	    return new BBReq('server', this.config, a);
	},
	portal: function(isCatalog) {
	    var a = ['portals', this.config.portal];
	    if (isCatalog) a.push('catalog');
	    return new BBReq('portal', this.config, a);
	},
	container: function(containerName) {
	    var a = ['portals', this.config.portal, 'containers'];
	    if (containerName) a.push(containerName);
	    return new BBReq('container', this.config, a);
	},
	widget: function(widgetName) {
	    var a = ['portals', this.config.portal, 'widgets'];
	    if (widgetName) a.push(widgetName);
	    return new BBReq('widget', this.config, a);
	},
	page: function(pageName) {
	    var a = ['portals', this.config.portal, 'pages'];
	    if (pageName) a.push(pageName);
	    return new BBReq('page', this.config, a);
	},
	link: function(linkName) {
	    var a = ['portals', this.config.portal, 'links'];
	    if (linkName) a.push(linkName);
	    return new BBReq('link', this.config, a);
	},
	user: function(userName, showGroups, groupName) {
	    var a = ['users'];
	    if (userName) a.push(userName);
	    if (showGroups) a.push('groups');
	    if (groupName) a.push(groupName);
	    return new BBReq('user', this.config, a);
	},
	group: function(groupName, showUsers) {
	    var a = ['groups'];
	    if (groupName) a.push(groupName);
	    if (showUsers) a.push('users');
	    return new BBReq('group', this.config, a);
	},
	template: function(templateName) {
	    var a = ['templates'];
	    if (templateName) a.push(templateName);
	    return new BBReq('template', this.config, a);
	},
	audit: function(meta) {
	    return new BBReq('audit', this.config, [meta? 'auditmeta' : 'auditevents']);
	},
	cache: function(type) {
	    var a = ['caches'];
	    switch(type) {
		case 'global':
		    a.push('globalModelCache');
		    break;
		case 'widget':
		    a.push('retrievedWidgetCache');
		    break;
		case 'chrome':
		    a.push('widgetChromeStaticCache');
		    break;
		case 'closure':
		    a.push('serverSideClosureCache');
		    break;
		case 'url':
		    a.push('urlLevelCache');
		    break;
		case 'web':
		    a.push('webCache');
		    break;
		case 'gmodel':
		    a.push('gModelCache');
		    break;
		default:
		    break;
	    }
	    return new BBReq('cache', this.config, a);
	},
	import: function() {
	},
	export: function() {
	}

    });

    function BBReq(cmnd, cnf, uri) {
	this.command = cmnd;
	this.config = cnf;
	this.uri = uri;
	this.qs = {};
	this.headers = {
	    "Content-Type": "application/xml"
	};
    }

    extend(BBReq.prototype, {
	xml: function() {
	    this.uri[this.uri.length - 1] += '.xml';
	    return this;
	},
	rights: function() {
	    this.uri.push('rights');
	    return this;
	},
	tag: function(tagName) {
	    this.uri.push('tags');
	    if (tagName) this.uri.push(tagName);
	    return this;
	},
	query: function(o) {
	    this.qs = o;
	    return this;
	},
	get: function() {
	    this.method = 'GET';
	    return this.req();
	},
	post: function(d, p) {
	    this.method = 'POST';
	    return this.parseInput(d, p);
	},
	put: function(d, p) {
	    this.method = 'PUT';
	    return this.parseInput(d, p);
	},
	// fixing inconsistencies in API
	// server /delete/catalog POST
	// portal /portals/[portal_name]/delete/catalog POST
	// link /portals/[portal_name]/delete/links POST
	delete: function(v, p) {
	    this.method = 'DELETE';
	    if (v) {
		this.method = 'POST';
		switch (this.command) {
		    case 'server':
			this.uri = ['delete', 'catalog'];
			break;
		    case 'portal':
			this.uri[2] = 'delete';
			this.uri[3] = 'catalog';
			break;
		    case 'link':
			this.uri[2] = 'delete';
			this.uri[3] = 'links';
			break;
		    default:
		       // code
		}
	    }
	    return this.parseInput(v, p);
	}
    });

var request = require('request'),
    Q = require('q'),
    readFile = Q.denodeify(require('fs').readFile),
    qReq = Q.denodeify(request);

module.exports = BBRest;
BBReq.prototype.req = function(data) {
    var t = this,
	uri = 'http://' + 
	      this.config.host + ':' +
	      this.config.port + '/' +
	      this.config.context + '/' +
	      this.uri.join('/');

    return qReq({
	auth: {
	    username: this.config.username,
	    password: this.config.password
	},
	uri: uri,
	qs: this.qs,
	method: this.method,
	headers: this.headers,
	body: data || ''
    })
    .then(function(p) {
	var o = {
	    statusCode: parseInt(p[0].statusCode),
	    info: p[0].request.httpModule.STATUS_CODES[p[0].statusCode],
	    body: p[0].body,
	    href: p[0].request.href,
	    method: p[0].request.method,
	    reqBody: data,
            headers: p[0].headers,
	    file: t.file || null
	};
	if (o.statusCode >= 400) o.error = true;
	else {
	}
	return o;
    })
    .fail(function(p) {
	return {
	    error: true,
	    statusCode: null,
	    info: 'Request failed',
	    body: null,
	    href: uri,
	    method: t.method,
	    reqBody: data,
	    file: t.file || null
	};
    }); 
};

BBReq.prototype.parseInput = function(inp, params) {
    var t = this;
    switch (typeof inp) {
        case 'string':
            this.file = inp;
            return readFile(inp)
            .then(function(d) {
                return t.req(d.toString());
            })
            .fail(function(p) {
                return {
                    error: true,
                    info: 'File path is wrong'
                };
            });
            break;
        case 'function':
            return inp.apply(t, params);
            break;
        default:
	    return this.req();
    }
};


	
	
})(this);