/* AE_Subtitles_CS6.jsx
   متوافق مع After Effects CS6.
   - إدخال الأسطر من ملف .txt (UTF-8) أو كحقل واحد مفصول بـ |
   - لون من Color Picker + حجم خط + تموضع عمودي + تتابع/معًا
   - تشكيل عربي متصل مقتبس ومُكيَّف من ArabicText.jsx (Salahuddin Taha) على مستوى السطر الواحد
   - Anchor في المنتصف الحقيقي + تعويض Position
   - مدة كل طبقة = عدد محارف السطر (ثوانٍ)
   مرجع منطق التشكيل: ArabicText.jsx. شكراً لصاحبه. */

(function(){

    // ===== Helpers (CS6-safe) =====
    function _trim(s){ return String(s).replace(/^\s+|\s+$/g,""); }
    function _safeNum(v, def){ var n = Number(v); return (isFinite(n) && n>0) ? n : def; }
    function _yForPosition(h, idx){
        if (idx===0) return h*0.80; // أسفل (فوق القاع 20%)
        if (idx===2) return h*0.30; // أعلى (تحت الحافة 30%)
        return h*0.50;              // منتصف
    }
    function _pickColor(startRGB){
        try{
            var start = 0xFFFFFF;
            if (startRGB && startRGB.length===3){
                start = (Math.round(startRGB[0]*255)<<16) |
                        (Math.round(startRGB[1]*255)<<8 ) |
                         Math.round(startRGB[2]*255);
            }
            if (typeof $.colorPicker !== "function") return null;
            var v = $.colorPicker(start);
            if (v === -1) return null;
            var r = ((v>>16)&0xFF)/255.0, g=((v>>8)&0xFF)/255.0, b=(v&0xFF)/255.0;
            return [r,g,b];
        }catch(e){ return null; }
    }
    function _centerTextAnchor(layer, t){
        if (!t && t!==0) t = 0;
        var r = layer.sourceRectAtTime(t, false);
        var anchor = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
        var pos    = layer.property("ADBE Transform Group").property("ADBE Position");
        var newA = [r.left + r.width/2, r.top + r.height/2];
        var oldA = anchor.value;
        var oldP = pos.value;
        anchor.setValue(newA);
        pos.setValue([ oldP[0] + (newA[0]-oldA[0]), oldP[1] + (newA[1]-oldA[1]) ]);
    }
    function _readLinesFromTxt(){
        var f = File.openDialog("اختر ملف نصي UTF-8 (كل سطر = طبقة)", "Text:*.txt");
        if (!f) return null;
        try{
            f.encoding = "UTF-8";
            if (!f.open("r")) throw new Error("تعذر فتح الملف");
            var txt = f.read(); f.close();
            if (!txt || !txt.length) return [];
            txt = String(txt).replace(/\u2028|\u2029/g,"\n").replace(/\r\n?/g,"\n");
            var raw = txt.split("\n"), out=[], i, line;
            for(i=0;i<raw.length;i++){
                line = _trim(raw[i]);
                if (line.length>0) out.push(line);
            }
            return out;
        }catch(e){
            try{ if(f && f.close) f.close(); }catch(_){}
            alert("خطأ قراءة الملف: " + e.toString());
            return null;
        }
    }

    // ===== Arabic shaping (مقتبس ومكيّف من ArabicText.jsx) =====
    // المرجع الأصلي: SALAHUDDIN TAHA — ArabicText.jsx (AE CS3/CS4). تم تبسيطه ليعمل كسطر مفرد ويُرجع نصاً مشكلاً.
    // غيرنا multiLine سلوكياً (نحن نعالج سطراً واحداً) وأبقينا لوجيك لام-ألف/التشكيل وأشكال الحروف.
    var noncon   = ['ا','ة','د','ذ','ر','ز','و','ى','ؤ','ء','أ','إ','ﺁ']; // لا تتصل بما بعدها
    var tashkeel = ['َ','ً','ِ','ٍ','ُ','ٌ','ّ']; // تشكيل

    // Isolated
    var form_0 = ['ا','ب','ة','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي','ى','ؤ','ئ','أ','إ','آ'];
    // Final
    var form_1 = ['\uFE8E','\uFE90','\uFE94','\uFE96','\uFE9A','\uFE9E','\uFEA2','\uFEA6','\uFEAA','\uFEAC','\uFEAE','\uFEB0','\uFEB2','\uFEB6','\uFEBA','\uFEBE','\uFEC2','\uFEC6','\uFECA','\uFECE','\uFED2','\uFED6','\uFEDA','\uFEDE','\uFEE2','\uFEE6','\uFEEA','\uFEEE','\uFEF2','\uFEF0','\uFE86','\uFE8A','\uFE84','\uFE88','\uFE82'];
    // Initial
    var form_2 = ['\uFE8D','\uFE91','\uFE94','\uFE97','\uFE9B','\uFE9F','\uFEA3','\uFEA7','\uFEA9','\uFEAB','\uFEAD','\uFEAF','\uFEB3','\uFEB7','\uFEBB','\uFEBF','\uFEC3','\uFEC7','\uFECB','\uFECF','\uFED3','\uFED7','\uFEDB','\uFEDF','\uFEE3','\uFEE7','\uFEEB','\uFEED','\uFEF3','\uFEEF','\uFE85','\uFE8B','\uFE83','\uFE87','\uFE81'];
    // Medial
    var form_3 = ['\uFE8E','\uFE92','\uFE94','\uFE98','\uFE9C','\uFEA0','\uFEA4','\uFEA8','\uFEAA','\uFEAC','\uFEAE','\uFEB0','\uFEB4','\uFEB8','\uFEBC','\uFEC0','\uFEC4','\uFEC8','\uFECC','\uFED0','\uFED4','\uFED8','\uFEDC','\uFEE0','\uFEE4','\uFEE8','\uFEEC','\uFEEE','\uFEF4','\uFEF0','\uFE86','\uFE8C','\uFE84','\uFE88','\uFE82'];

    function index_of(ch){
        var i=-1, j;
        for(j=0;j<form_0.length;j++){ if(ch===form_0[j]){ i=j; break; } }
        return i;
    }
    function check_tashkeel(ch){
        var i, ok=false;
        for(i=0;i<tashkeel.length;i++){ if(ch===tashkeel[i]){ ok=true; break; } }
        return ok;
    }
    function check_con(ch){
    
        var i, inSet=false;
        for(i=0;i<form_0.length;i++){ if(ch===form_0[i]){ inSet=true; break; } }
        if (!inSet) return false;
        for(i=0;i<noncon.length;i++){ if(ch===noncon[i]) return false; }
        return true;
    }

    // يُشكّل "سطر واحد" ويُعيد نصاً عربياً متصلاً (لا يتعامل هنا مع تعدد الأسطر).
    function shapeArabicSingleLine(src){
        var in_text = String(src);
        var con_text = "";
        var i, cur, prv, nxt, indx_cur;

        for(i=1;i<in_text.length+1;i++){
            if(i > 1){
                nxt = in_text[in_text.length-(i-1)];
                if(check_tashkeel(nxt))
                    nxt = in_text[in_text.length-(i-2)];
            } else { nxt = -1; }

            cur = in_text[in_text.length-i];

            if(i < in_text.length){
                prv = in_text[in_text.length-(i+1)];
                if(check_tashkeel(prv))
                    prv = in_text[in_text.length-(i+2)];
            } else { prv = -1; }

            indx_cur = index_of(cur);

            if(indx_cur < 0){
                con_text += cur;
            } else if((cur=='ا'&&prv=='ل')||(cur=='أ'&&prv=='ل')||(cur=='إ'&&prv=='ل')||(cur=='آ'&&prv=='ل')){
                // سيتم التعامل مع لام-ألف في دور اللام
                continue;
            } else if(cur=='ل' && nxt=='ا' && !check_con(prv)){
                con_text += '\uFEFB';
            } else if(cur=='ل' && nxt=='ا' && check_con(prv)){
                con_text += '\uFEFC';
            } else if(cur=='ل' && nxt=='أ' && !check_con(prv)){
                con_text += '\uFEF7';
            } else if(cur=='ل' && nxt=='أ' && check_con(prv)){
                con_text += '\uFEF8';
            } else if(cur=='ل' && nxt=='إ' && !check_con(prv)){
                con_text += '\uFEF9';
            } else if(cur=='ل' && nxt=='إ' && check_con(prv)){
                con_text += '\uFEFA';
            } else if(cur=='ل' && nxt=='آ' && !check_con(prv)){
                con_text += '\uFEF5';
            } else if(cur=='ل' && nxt=='آ' && check_con(prv)){
                con_text += '\uFEF6';
            } else if(!check_con(prv) && index_of(nxt)<0){
                con_text += form_0[indx_cur];
            } else if(!check_con(prv) && index_of(nxt)>=0){
                con_text += form_2[indx_cur];
            } else if(check_con(prv) && index_of(nxt)>=0){
                con_text += form_3[indx_cur];
            } else if(check_con(prv) && index_of(nxt)<0){
                con_text += form_1[indx_cur];
            }
        }

        // إضافة RLM لتحسين اتجاه العرض في AE عند اللزوم
        return con_text; 
    }
    // ===== نهاية منطق التشكيل (مقتبس ومكيّف) =====

    // ===== UI =====
    var win = new Window("dialog", "إنشاء subtitles");
    win.orientation="column"; win.margins=10; win.alignChildren=["fill","top"];

    var gLines = win.add("group"); gLines.alignment="fill"; gLines.orientation="column";
    gLines.add("statictext", undefined, "أدخل الأسطر مفصولة بـ |  (مثال: سطر1|سطر2|سطر3) أو حمّل ملف .txt:");
    var etPipe = gLines.add("edittext", undefined, "", {multiline:false}); etPipe.characters=70;
    var gFile = gLines.add("group"); gFile.alignment="fill";
    var btnLoad = gFile.add("button", undefined, "تحميل من ملف .txt (UTF-8)");

    // اللون
    var selectedColor = [1,1,1];
    var gColor = win.add("group"); gColor.alignment="fill";
    var btnPick = gColor.add("button", undefined, "اختيار لون النص…");
    var lblColor = gColor.add("statictext", undefined, "اللون الحالي: أبيض");

    btnPick.onClick = function(){
        var c = _pickColor(selectedColor);
        if (c){ selectedColor=c; lblColor.text="تم اختيار لون."; }
    };

    // الحجم/التموضع/التوقيت/العربية
    var gOpts1 = win.add("group"); gOpts1.alignment="fill";
    gOpts1.add("statictext", undefined, "حجم الخط:");
    var etSize = gOpts1.add("edittext", undefined, "64"); etSize.characters=6;

    gOpts1.add("statictext", undefined, "التموضع:");
    var ddPos = gOpts1.add("dropdownlist", undefined, ["أسفل (20%)","منتصف","أعلى (30%)"]); ddPos.selection=1;

    var gOpts2 = win.add("group"); gOpts2.alignment="fill";
    var chkSeq = gOpts2.add("checkbox", undefined, "عرض بالتتابع"); chkSeq.value=true;
    var chkRTL = gOpts2.add("checkbox", undefined, "تفعيل RTL + تشكيل عربي"); chkRTL.value=true;

    var gBtns = win.add("group"); gBtns.alignment="right";
    var btnOK = gBtns.add("button", undefined, "موافق");
    var btnCancel = gBtns.add("button", undefined, "إلغاء");

    var loadedLines = null;

    btnLoad.onClick = function(){
        var arr = _readLinesFromTxt();
        if (arr === null) return;
        loadedLines = arr;
        etPipe.text = arr.join("|");
    };
    btnCancel.onClick = function(){ win.close(0); };

    btnOK.onClick = function(){
        var lines = [];
        if (loadedLines && loadedLines.length){
            lines = loadedLines;
        } else {
            var raw = _trim(etPipe.text||"");
            if (!raw.length){ alert("فضلاً أدخل نصًا أو حمّل ملف .txt"); return; }
            var parts = raw.split("|"), i, L;
            for(i=0;i<parts.length;i++){
                L = _trim(parts[i]);
                if (L.length) lines.push(L);
            }
        }
        if (!lines.length){ alert("لا توجد أسطر صالحة."); return; }

        var proj = app.project; if(!proj){ alert("لا يوجد مشروع مفتوح."); return; }
        var comp = proj.activeItem; if(!(comp && comp instanceof CompItem)){ alert("اختر Composition نشط."); return; }

        var color = (selectedColor && selectedColor.length===3) ? selectedColor : [1,1,1];
        var size = _safeNum(etSize.text, 64);
        var posIdx = ddPos.selection ? ddPos.selection.index : 1;
        var sequential = !!chkSeq.value;
        var doRTL = !!chkRTL.value;

        app.beginUndoGroup("Create Text Lines (CS6 Arabic)");

        try{
            var cx = comp.width*0.5, cy = _yForPosition(comp.height, posIdx);
            var t=0.0, requiredEnd=0.0;

            for (var i=0;i<lines.length;i++){
                var rawLine = String(lines[i]);
                var shaped  = doRTL ? shapeArabicSingleLine(rawLine) : rawLine;

                var lyr = comp.layers.addText(shaped);

                // توقيت = عدد المحارف (ثوانٍ)
                var dur = Math.max(0.01, rawLine.length * 0.5);
                var inT = sequential ? t : 0.0;
                var outT = inT + dur;
                lyr.inPoint = inT; lyr.outPoint = outT;
                if (sequential) t = outT;
                if (outT > requiredEnd) requiredEnd = outT;

                // خصائص النص (بدون تحديد font)
                var tp = lyr.property("ADBE Text Properties").property("ADBE Text Document");
                var td = tp.value;
                td.fontSize  = size;
                td.applyFill = true;
                td.fillColor = color;
                td.justification = ParagraphJustification.CENTER_JUSTIFY;

                if (doRTL){
                    try{
                        if (typeof td.applyRightToLeft !== "undefined") td.applyRightToLeft = true;
                        else if (typeof td.rightToLeft !== "undefined") td.rightToLeft = true;
                        else if (typeof td.rtl !== "undefined") td.rtl = true;
                    }catch(_){}
                }
                tp.setValue(td);

                // الموضع + توسيط الـ Anchor
                lyr.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
                _centerTextAnchor(lyr, inT);
            }

            if (requiredEnd > comp.duration) comp.duration = requiredEnd + 0.5;

            alert("تم إنشاء " + lines.length + " طبقة نصية.");
            win.close(1);
        }catch(err){
            alert("خطأ: " + err.toString());
        }finally{
            app.endUndoGroup();
        }
    };

    win.center(); win.show();

})();
