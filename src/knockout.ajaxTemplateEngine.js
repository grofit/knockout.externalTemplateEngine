(function (factory) {
    // Module systems magic dance.

    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node: hard-coded dependency on "knockout"
        factory(require("knockout"));
    } else if (typeof define === "function" && define["amd"]) {
        // AMD anonymous module with hard-coded dependency on "knockout"
        define(["knockout"], factory);
    } else {
        // <script> tag: use the global `ko` object, attaching a `mapping` property
        factory(ko);
    }
}
(function (ko) {

    function AjaxTemplateSource(templateName, templateLocator, options)
    {
        var status = {
            notLoaded: 1,
            loading: 2,
            failedToLoad: 3,
            loaded: 4
        };

        this.templateId = templateName;
        this.status = status.notLoaded;
        this.template = ko.observable(" ");
        this.data = {};

        this.data = function(key, value) {
            if (arguments.length === 1) { return this.data[key]; }
            this.data[key] = value;
        };

        this.text = function(value) {
            if (this.status == status.notLoaded) { this.getTemplate(); }
            if (arguments.length === 0) { return this.template(); }
            this.template(value);
        };

        this.getTemplate = function() {
            var self = this;
            this.status = status.loading;
            templateLocator
                .getTemplateHtml(templateName, options)
                .then(function(templateHtml) {
                    self.template(templateHtml);
                    self.status = status.loaded;
                })
                .catch(function(error){
                    self.status = status.failedToLoad;
                    self.data("error", error);
                    console.error(error);
                    self.template("");
                });
        };
    }

    function DefaultTemplateLocator() {
        this.defaultTemplateLocation = "templates";
        this.defaultTemplateSuffix = ".template.html";

        var makeGetRequest = function(url) {
            return new Promise(function(resolve, reject)
            {
                var request = new XMLHttpRequest();
                request.open("GET", url, true);
                request.onload = function() {
                    if(request.status == 200) { resolve(request.responseText); }
                    else { reject(request.statusText); }
                };
                request.onerror = function(event) { reject(event.error); };
                request.send();
            });
        };

        this.locateTemplate = function(templateName, options) {
            var templateLocation = options.location || this.defaultTemplateLocation;
            var templateSuffix = options.suffix || this.defaultTemplateSuffix;
            return templateLocation + "/" + templateName + templateSuffix;
        };

        this.getTemplateHtml = function(templateName, options) {
            var url = this.locateTemplate(templateName, options);
            return makeGetRequest(url);
        }
    }

    function AjaxTemplateEngine() {
        this.templates = {};
        this.templateLocator = new DefaultTemplateLocator();

        this.makeTemplateSource = function(template, bindingContext, options) {
            var self = this;

            if (typeof template == "string") {
                var elem = document.getElementById(template);
                if (elem) { return new ko.templateSources.domElement(elem); }

                if(!self.templates[template])
                { self.templates[template] = new ko.templateSources.ajaxTemplateSource(template, this.templateLocator, options); }

                return self.templates[template];
            }
            else if ((template.nodeType == 1) || (template.nodeType == 8))
            { return new ko.templateSources.anonymousTemplate(template); }
        };

        this.renderTemplate = function (template, bindingContext, options, templateDocument) {
            var templateSource = this.makeTemplateSource(template, templateDocument, options);
            return this.renderTemplateSource(templateSource, bindingContext, options, templateDocument);
        };
    }

    ko.templateSources.ajaxTemplateSource = AjaxTemplateSource;
    ko.ajaxTemplateEngine = new ko.utils.extend(new ko.nativeTemplateEngine(), new AjaxTemplateEngine());
    ko.setTemplateEngine(ko.ajaxTemplateEngine);

}));