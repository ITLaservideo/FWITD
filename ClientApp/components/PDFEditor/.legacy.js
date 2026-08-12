import { Boilerplate } from "../../utils/boilerplate.min.js?v=019";
import { Locale } from "../../utils/locales/locales.min.js?v=019";
// import { Locale } from "?CHANGEME?/utils/locales/locales.MOCK";
import { newDynamicModule, UiBuilder } from "../../utils/UiBuilder.min.js?v=019";
import { refXLSX } from "../export_data/XLSX.min.js?v=019";
import { refjsPDF } from "../export_data/jsPDF.min.js?v=019"; //used to render HTML page to PDF
import { refHtml2Canvas } from "../export_data/html2canvas.min.js?v=019"; // dependency jsPDF
import { refpdfLib } from "../export_data/pdf-lib.min.js?v=019"; //used to merge multiple PDFs in one, it does not support html rendering
import UiBuilder2 from "../../utils/UiBuilder2.min.js?v=019";
//const capitalize = UiBuilder.capitalize;

/**
 * @version 1.1
 */
export default class PDFMerger {
    /**
     * @type Element
     */
    #self_ref;
    static #html_placeholder = null;
    #onClose = [];
    exporting_data_title = null;
    constructor(options) {
        this.options = options;
        this.#initialize(options);
    }
    async #initialize(options) {
        if (PDFMerger.pro_user == undefined) {
            if (document.querySelector("[name~=expert-user][content]")?.content == "true") {
                PDFMerger.pro_user = true;
            } else {
                PDFMerger.pro_user = false;
            }
        }
        const owner = this;
        this.#self_ref = (await PDFMerger.#html_placeholder).cloneNode(true);
        if (options.onClose != undefined) {
            try {
                for (let i = 0; i < options.onClose.length; i++) {
                    owner.#onClose.push(options.onClose[i]);
                }
            } catch (error) {
                owner.#onClose.push(options.onClose);
            }
        }
        await Locale.initialize();

        const maxFiles = 10; // Change this to your desired N
        const input = this.#self_ref.querySelector("[id='pdf-merger-input']");
        const message = this.#self_ref.querySelector("[id='pdf-merger-message']");
        this.#elements.input = input;
        input.addEventListener('change', () => {
            const files = input.files;
        });
        this.#self_ref.appendChild(UiBuilder.createButton({
            onClick: () => {
                owner.savePDFsInOne();
            },
            // hint: "",
            icon: "save.svg",
            title: 'merge them',
            class: "ppt-i-save"
        }))
    }
    #elements = {
        /**
         * @type Element
         */
        input: null
    };
    async savePDFsInOne() {
        const owner = this;
        const files = owner.#elements.input.files; //<input type="file" id="pdf-merger-input" multiple>
        if (files.length <= 0) {
            return;
        }
        const array_buffer = await Promise.all(
            Array.from(files).map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });
            })
        );
        const merged_doc = await owner.mergePdfs(array_buffer);
        const blob = new Blob([merged_doc], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = "merged"
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Clean up
    }
    /**
     * Merges multiple PDFs and adds pagination to each page.
     * @param {ArrayBuffer[]} pdfsToMerges - Array of PDF buffers to merge.
     * @returns {Promise<Uint8Array>} - Merged PDF file as Uint8Array.
     */
    async mergePdfs(pdfsToMerges) {
        const PDFDocument = window.exportsPDFLIB.PDFDocument;

        const mergedPdf = await PDFDocument.create();
        const font = await mergedPdf.embedFont(window.exportsPDFLIB.StandardFonts.HelveticaOblique);

        let totalPages = 0;
        const allCopiedPages = [];

        // First, copy all pages from all PDFs
        for (const pdfBuffer of pdfsToMerges) {
            const pdf = await PDFDocument.load(pdfBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            allCopiedPages.push(...copiedPages);
            totalPages += copiedPages.length;
        }

        // Then, add each page and draw pagination
        allCopiedPages.forEach((page, index) => {
            mergedPdf.addPage(page);
            const { width } = page.getSize();
            page.drawText(`Page ${index + 1} of ${totalPages}`, {
                x: width - 100,
                y: 20,
                size: 10,
                font: font,
                color: window.exportsPDFLIB.rgb(0, 0, 0),
            });
        });

        const mergedPdfFile = await mergedPdf.save();
        return mergedPdfFile;
    }


    /**
     * 
     * @returns Element
     */
    async elementReference() {
        await PDFMerger.#html_placeholder;
        return this.#self_ref;
    }
    /**
     * 
     * @param {Node} clone 
     * @param {Number} timeout ms
     */
    static #executeDestroy(clone, timeout) {
        setTimeout(() => {
            if (clone != null) {
                if (PDFMerger.enable_animations == true) {
                    clone.classList.add("PDFMerger-destroy-animation");
                    timeout += 30;
                }
                setTimeout(() => {
                    clone.remove();
                }, timeout);
            } else {
                console.warn("tried to destroy a PDFMerger already destroyed!");
            }
        }, timeout);
    }/**
     * 
     * @param {number} timeout_ms 0 by default
     */
    async destroy(timeout_ms = 0) {
        if (this.destroyed != undefined) {
            return;
        }
        this.destroyed = true;
        await PDFMerger.#html_placeholder;
        if (this.#self_ref != undefined) {
            PDFMerger.#executeDestroy(this.#self_ref, timeout_ms);
        } else {
            setTimeout(() => {
                PDFMerger.#executeDestroy(this.#self_ref, timeout_ms);
            }, 1500);
        }
        for (let i = 0; i < this.#onClose.length; i++) {
            setTimeout(() => {
                this.#onClose[i]();
            }, 0);
        }
    }
    static load() {
        PDFMerger.#html_placeholder = Boilerplate.loadHTMLAndCSS("js/components/pdf_merger/pdf_merger.min.html", "js/components/pdf_merger/pdf_merger.min.css");
    }
}
/**
 * @version 1.2
 * @param {JSONType} json sender, request_type, args
 * @param {Function} next called on success next(JSONType)
 * @param {Function} error called onerror
 */
function postXmlHR(json, request_type, next = null, override_path = null, onError = () => { window.location.reload() }) {
    let xhr = new XMLHttpRequest();
    xhr.onerror = function () {
        xhr.errorFlag = true;
    };
    const path = override_path ?? "PairingProductToMotor";
    xhr.open("POST", `components/WebServices/${path}.asmx`, true);
    xhr.setRequestHeader("Content-Type", "text/xml; charset=utf-8");
    xhr.onloadend = () => {
        try {
            //TODO VALIDATE
            const xmlDoc = (new DOMParser()).parseFromString(xhr.responseText, "text/xml");
            const jsonString = xmlDoc.getElementsByTagName(`${request_type}Result`)[0].childNodes[0].nodeValue;
            const response = JSON.parse(jsonString);
            try {
                next(response);
            } catch (err) { console.error(err); }
        } catch (error) {
            onError();
        }
    }
    const args = UiBuilder.escapeXmlCharacters(JSON.stringify(json));
    xhr.send(`<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${request_type} xmlns="http://tempuri.org/"><json_args>${args}</json_args></${request_type}></soap:Body></soap:Envelope>`);
}
const load_time = new Date();
const cache_id = `v=${load_time.getDate()}${load_time.getMonth() + 1}${load_time.getFullYear()}`;
PDFMerger.load();