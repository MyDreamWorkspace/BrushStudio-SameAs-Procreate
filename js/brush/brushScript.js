import {shapes, textures, getFabricCanvas} from './initialize.js'
$(document).ready(function(){
    var tempBrushOpts = {};
    var call_stack_length = 10;
    var isShapeSelect = true;
    var isPreventCall = true;
    let emptyMode = "None Button"; // or Zero Percent
    $(".drawing-setting-btn").on("click", function(event){
        event.stopPropagation();
        if($(".drawing-setting-panel").hasClass("active")){
            $(".drawing-setting-panel").removeClass("active");
        }
        else{
            $(".drawing-setting-panel").addClass("active");
        }
    });

    $("#previewer").click(function(){
        $(".drawing-setting-panel").removeClass("active");
    });

    (canvasID => {
        let brushName = localStorage.getItem("CurBrush") || "NewBrush";
		let brushOpts = JSON.parse(localStorage.getItem(brushName) || "{'brushCol': 0, 'patternCol': 0}");
        tempBrushOpts =  $.extend(true, {}, brushOpts);
		brushOpts.color = "#ffffff";
		brushOpts.width = 0.35;
		brushOpts.opacity = 1;
		brushOpts.brushCol = shapes[brushOpts.brushCol || 0];
		brushOpts.patternCol = textures[brushOpts.patternCol || 0];
        const fabricCanvas = getFabricCanvas(canvasID, 'CustomBrush', brushOpts);
        fabricCanvas.contextTop.globalAlpha = brushOpts.opacity;

        $("#shape_img").attr('src', brushOpts.brushCol);
        $("#grain_img").attr('src', brushOpts.patternCol);

        var clearDrawing = () => {
            fabricCanvas.clear();
            if (fabricCanvas.freeDrawingBrush.brush != undefined)
                fabricCanvas.freeDrawingBrush.brush.setClear();
        }

        var resetAllSetting = () => {
            let sliders = document.getElementsByTagName("tc-range-slider");
            for( let i = 0; i < sliders.length; i++){
                let one_slider = sliders[i];
                let default_value = one_slider.getAttribute("data-default-value");
                let shower_id = "#" + one_slider.getAttribute("data-shower-id") + "";
                if(one_slider.getAttribute("data-shower-id") != ""){
                    $(shower_id).text(default_value);
                }else{
                    continue;
                }
                one_slider.setAttribute("value", default_value);
            }
            let checkboxs = document.getElementsByTagName("input");
            for(let i = 0; i < checkboxs.length; i++){
                if(checkboxs[i].type == "checkbox"){
                    let default_value = checkboxs[i].getAttribute("data-default-value");
                    let boolean_default_value = (default_value === "true");
                    let id = "#" + checkboxs[i].getAttribute("id") + "";
                    $(id)[0].checked = boolean_default_value;
                }
            }
        }

        $('#clearbtn')[0].onclick = clearDrawing;
        $('#resetbtn')[0].onclick = resetAllSetting;

        var setBrushAttribute = (attr, val) => {
            // console.log(attr, val);
            tempBrushOpts[attr] = val;
            switch (attr)
            {
                case "stroke_spacing":
                    fabricCanvas.freeDrawingBrush.brush.setSpacing(val * 0.01); //0~100% distance between stamps
                    break;
                case "stroke_jitter":
                    fabricCanvas.freeDrawingBrush.brush.setNormalSpread(val * 0.02);//0-10 Jitter
                    fabricCanvas.freeDrawingBrush.brush.setTangentSpread(val * 0.02);//0-10
                    break;
                case "stroke_falloff":
                    fabricCanvas.freeDrawingBrush.brush.setFallOff(val * 0.01);//0-100%
                    break;
                case "stabal_streamline":
                    fabricCanvas.freeDrawingBrush.setToolStabilizeWeight(0.2 + val * 0.6 / 100);//0.2-0.8
                    break;
                case "stabal_stabalization":
                    fabricCanvas.freeDrawingBrush.setToolStabilizeLevel(4 + val * 16 / 100);//4-20
                    break;
                case "taper_min_amount":
                    fabricCanvas.freeDrawingBrush.brush.setTaperMinAmount(val * 0.01); //0~20%
                    break;
                case "taper_max_amount":
                    fabricCanvas.freeDrawingBrush.brush.setTaperMaxAmount(val * 0.01); //80~100%
                    break;
                case "taper_size":
                    fabricCanvas.freeDrawingBrush.brush.setTaperSize(val * 0.01); //0~100%
                    break;
                case "taper_opacity":
                    fabricCanvas.freeDrawingBrush.brush.setTaperOpacity(val * 0.01); //0~100%
                    break;
                case "taper_tip":
                    fabricCanvas.freeDrawingBrush.brush.setTaperTip(val * 0.01); //0~100%
                    break;
                case "shape_scatter":
                    fabricCanvas.freeDrawingBrush.brush.setShapeScatter(val * 3.6);
                    break;
                case "shape_rotation":
                    fabricCanvas.freeDrawingBrush.brush.setShapeRotation(val * 0.01);
                    break;
                case "shape_count":
                    fabricCanvas.freeDrawingBrush.brush.setShapeCount(val * 0.2);
                    break;
                case "shape_countJitter":
                    fabricCanvas.freeDrawingBrush.brush.setShapeCountJitter(val * 0.01);//0~100%
                    break;
                case "moving_movement":
                    fabricCanvas.freeDrawingBrush.brush.setGrainMovement(val * 0.01);
                    break;
                case "moving_scale":
                    fabricCanvas.freeDrawingBrush.brush.setGrainMoveScale(val * 0.01); //0~100%
                    break;
                case "moving_zoom":
                    fabricCanvas.freeDrawingBrush.brush.setGrainMoveZoom(val * 0.01); //0~100%
                    break;
                case "moving_rotation":
                    fabricCanvas.freeDrawingBrush.brush.setGrainMoveRotation(val * 360 * 0.01); //-100%~100%
                    break;
                case "moving_depth":
                    fabricCanvas.freeDrawingBrush.brush.setGrainMoveDepth(val * 0.01); //0~100%
                    break;
                case "texture_scale":
                    fabricCanvas.freeDrawingBrush.brush.setGrainTexScale(val * 0.01); //0~100%
                    break;
                case "texture_depth":
                    fabricCanvas.freeDrawingBrush.brush.setGrainTexDepth(val * 0.01); //0~100%
                    break;
                case "texture_brightness":
                    fabricCanvas.freeDrawingBrush.brush.setGrainTexBrightness(val / 100); //-100%~100%
                    break;
                case "texture_contrast":
                    fabricCanvas.freeDrawingBrush.brush.setGrainTexContrast(val / 100); //-100%~100%
                    break;
                case "dynamics_speedSize":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicSpeedSize(val * 0.01); //-100%~100% stamp size relative to speed
                    break;
                case "dynamics_speedOpacity":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicSpeedOpacity(val * 0.01); //-100%~100% stamp opacity relative speed
                    break;
                case "dynamics_jitterSize":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicJitterSize(val * 0.01); //0~100% random stamp size
                    break;
                case "dynamics_jitterOpacity":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicJitterOpacity(val * 0.01); //0~100% random stamp opacity
                    break;
                case "brush_max_size":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicBrushMaxSize(val * 0.01); //0%-500%
                    break;
                case "brush_min_size":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicBrushMinSize(val * 0.01); //0%-100%
                    break;
                case "brush_max_opacity":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicBrushMaxOpacity(val * 0.01); //0~100%
                    break;
                case "brush_min_opacity":
                    fabricCanvas.freeDrawingBrush.brush.setDynamicBrushMinOpacity(val * 0.01); //0~100%
                    break;
                case "shape_randomized":
                    fabricCanvas.freeDrawingBrush.brush.setShapeRandomized(val);
                    break;
                case "shape_azimuth":
                    fabricCanvas.freeDrawingBrush.brush.setShapeAzimuth(val);
                    break;
                case "shape_flipX":
                    fabricCanvas.freeDrawingBrush.brush.setShapeFlipX(val);
                    break;
                case "shape_flipY":
                    fabricCanvas.freeDrawingBrush.brush.setShapeFlipY(val);
                    break;
                case "moving_offset_jitter":
                    fabricCanvas.freeDrawingBrush.brush.setGrainMoveOffsetJitter(val);
                    break;
                case "stamp_hue":
                    fabricCanvas.freeDrawingBrush.brush.setStampHue(val * 0.01);
                    break;
                case "stamp_saturation":
                    fabricCanvas.freeDrawingBrush.brush.setStampSaturation(val * 0.01);
                    break;
                case "stamp_secondaryColor":
                    fabricCanvas.freeDrawingBrush.brush.setStampSecondaryColor(val * 0.01);
                    break;
                case "stroke_hue":
                    fabricCanvas.freeDrawingBrush.brush.setStrokeHue(val * 0.01);
                    break;
                case "stroke_saturation":
                    fabricCanvas.freeDrawingBrush.brush.setStrokeSaturation(val * 0.01);
                    break;
                case "stroke_secondaryColor":
                    fabricCanvas.freeDrawingBrush.brush.setStrokeSecondaryColor(val * 0.01);
                    break;
                case "pressure_hue":
                    fabricCanvas.freeDrawingBrush.brush.setPressureHue(val * 0.01);
                    break;
                case "pressure_saturation":
                    fabricCanvas.freeDrawingBrush.brush.setPressureSaturation(val * 0.01);
                    break;
                case "pressure_secondaryColor":
                    fabricCanvas.freeDrawingBrush.brush.setPressureSecondaryColor(val * 0.01);
                    break;
                case "blending_glaze":
                    fabricCanvas.freeDrawingBrush.brush.setBlendingGlaze(val);
                    break;
                case "blending_intenseGlaze":
                    fabricCanvas.freeDrawingBrush.brush.setBlendingIntenseGlaze(val);
                    break;
                case "blending_blend":
                    fabricCanvas.freeDrawingBrush.brush.setBlendingBlend(val);
                    break;
                case "blending_intenseBlend":
                    fabricCanvas.freeDrawingBrush.brush.setBlendingIntenseBlend(val);
                    break;
                case "blending_flow":
                    fabricCanvas.freeDrawingBrush.brush.setBlendingFlow(val * 0.01);
                    break;
                case "blending_luminance":
                    fabricCanvas.freeDrawingBrush.brush.setBlendingLuminance(val);
                    break;
                case "blend_mode":
                    fabricCanvas.freeDrawingBrush.brush.setBlendMode(val);
                    break;
                case "preview_size":
                    fabricCanvas.freeDrawingBrush.brush.setSize(val * 0.01);
                    break;
            }
        }

        $(".switch-btn").on("click", function(){
            $(".switch-btn").removeClass("active");
            $(".detail-set-sub-body").removeClass("active");
            $(this).addClass("active");
            let sub_panel_id = "#"+ $(this).attr("data-sub-panel-id")+"";
            $(sub_panel_id).addClass("active");
            if (sub_panel_id == "#setting_moving")
            {
                tempBrushOpts.grainEffect = 1;
                fabricCanvas.freeDrawingBrush.brush.setGrainEffect(1);
            }
            else
            {
                tempBrushOpts.grainEffect = 2;
                fabricCanvas.freeDrawingBrush.brush.setGrainEffect(2);
            }
            fabricCanvas.freeDrawingBrush.loadPattern();
        });

        $("input[type='checkbox']").on("change", function () {
            let id = $(this).attr("data-shower-id");
            if (this.className == 'blending-group')
            {
                for(var i = 0; i < $(".blending-group").length; i++){
                    $(".blending-group")[i].checked = false;
                    setBrushAttribute($(".blending-group")[i].id, false);
                }
                $(this)[0].checked = true;
                setBrushAttribute(this.id, true);
            }
            else
            {
                setBrushAttribute(this.id, this.checked);
            }
        });

        $("select").change(function () {
            var str = "";
            $( "select option:selected" ).each(function() {
                str += $( this ).val();
            });
            setBrushAttribute(this.id, str);
        })
        .change();

        $("tc-range-slider").on("change", function () {
            let shower_id = "#" + $(this).attr("data-shower-id") + "";
            if($(this).attr("data-shower-id") != ""){
                setBrushAttribute($(this).attr("data-shower-id"), $(this)[0].value);
                if($(this)[0].value == 0){
                    if(emptyMode == "None Button") {
                        $(shower_id).text('None');
                    }
                    else if(emptyMode == "Zero Percent"){
                        $(shower_id).text("0%");
                    }
                }
                else if($(this)[0].value == $(this)[0].max){
                    $(shower_id).text("Max");
                }
                else if($(this)[0].value == $(this)[0].min){
                    $(shower_id).text("Min");
                }
                else{
                    $(shower_id).text($(this)[0].value + "%")
                }
            }
        });

        $("#taper_amount").on("change", function () {
            if(!isPreventCall){
                call_stack_length = 10;
            }
            if(call_stack_length < 0){
                if($(this)[0].value1 < 20 || $(this)[0].value2 > 80) {
                    isPreventCall = false;
                }
                return;
            }
            let value1 = $(this)[0].value1;
            let value2 = $(this)[0].value2;
            if(value1 > 20){
                $(this)[0].value1 = 20;
                call_stack_length--;
            }
            if(value2 < 80){
                $(this)[0].value2 = 80;
                call_stack_length--;
            }
            setBrushAttribute("taper_min_amount", $(this)[0].value1);
            setBrushAttribute("taper_max_amount", $(this)[0].value2);
        })

        $(".color-option").on("click", function(){
           $(".color-option").removeClass("active");
           $(this).addClass("active");
           fabricCanvas.freeDrawingBrush.color = $(this)[0].style.backgroundColor;
        });

        $(".two-nd-color-option").on("click", function(){
            $(".two-nd-color-option").removeClass("active");
            $(this).addClass("active");
            fabricCanvas.freeDrawingBrush.scolor = $(this)[0].style.backgroundColor;
        });

        $(".set-tab").on("click", function(){
            $(".set-tab").removeClass("active-tab");
            $(this).addClass("active-tab");
            let paneltitle = $(this).attr("data-panel-title");
            let panelId = "#" + $(this).attr("data-detail-id") +"";
            let editable = $(this).attr("data-editable");
            if(editable == "true"){
                let id = $(this).attr("data-edit-id");
                $("#detail-set-control").html(
                    "<label style='margin:0 !important;color:black;' for='"+ id +"' id='" + id + "'>Edit</label>");
                     // "<input id='"+ id+ "' style='display:none;' type='file'>");

                // $("#shapeEdit").change(function(){
                //     if (this.files && this.files[0]) {
                //         var reader = new FileReader();
                //         reader.onload = (e) => {
                //                 console.log("shape image name", this.files[0].name);
                //                 $("#shape_img").attr('src', e.target.result);
                //                 fabricCanvas.freeDrawingBrush.brushCol = 'images/shapes/' + this.files[0].name;
                //                 fabricCanvas.freeDrawingBrush.loadPattern();
                //         }
                //         reader.readAsDataURL(this.files[0]);
                //     }
                // });

                // $("#grainEdit").change(function(){
                //     if (this.files && this.files[0]) {
                //         var reader = new FileReader();
                //         reader.onload = (e) => {
                //             console.log("grain texture name", this.files[0].name);
                //             $("#grain_img").attr('src', e.target.result);
                //             if (fabricCanvas.freeDrawingBrush.brush.getGrainEffect() == 0)
                //                 fabricCanvas.freeDrawingBrush.brush.setGrainEffect(1);
                //             fabricCanvas.freeDrawingBrush.patternCol = 'images/textures/' + this.files[0].name;
                //             fabricCanvas.freeDrawingBrush.loadPattern();
                //         }
                //         reader.readAsDataURL(this.files[0]);
                //     }
                // });

                function showImgSelect()
                {
                    $('#img_select .modal-header').text(isShapeSelect ? "Select Shape Image": "Select Texture Image");
                    $('#img-container').find('.img-item').remove();
                    (isShapeSelect ? shapes : textures).forEach((shape) => {
                        $('#img-container').append('<div class="img-item col-sm-4"><img class="preview-img" src="' + shape + '"/></div>');
                    })
                    $(".img-item").on("click", function(){
                        $(".img-item").removeClass("selected");
                        $(this).addClass("selected");
                    });
                    $("#img_select").show();
                };

                $("#shapeEdit").click(function(){
                    isShapeSelect = true;
                    showImgSelect();
                });

                $("#grainEdit").click(function(){
                    isShapeSelect = false;
                    showImgSelect();
                });

                $("#btn_done").click(function() {
                    let img_name = $('#img-container').find('.img-item.selected > img')[0].src;
                    if (img_name == undefined)
                    {
                        alert("This image does not exist!");
                        return;
                    }
                    // console.log(img_name);
                    if (isShapeSelect)
                    {
                        tempBrushOpts.brushCol = shapes.indexOf(img_name.split(window.location.origin + "/").pop());
                        $("#shape_img").attr('src', img_name);
                        fabricCanvas.freeDrawingBrush.brushCol = img_name;
                    }
                    else {
                        tempBrushOpts.patternCol = textures.indexOf(img_name.split(window.location.origin + "/").pop());
                        if (fabricCanvas.freeDrawingBrush.brush.getGrainEffect() == 0)
                        {
                            tempBrushOpts.grainEffect = 1;
                            fabricCanvas.freeDrawingBrush.brush.setGrainEffect(1);
                        }
                        $("#grain_img").attr('src', img_name);
                        fabricCanvas.freeDrawingBrush.patternCol = img_name;
                    }
                    fabricCanvas.freeDrawingBrush.loadPattern();
                    $(".modal").hide();
                });
            }
            else {
                $("#detail-set-control").text("");
            }
            $(".detail-set-panel").removeClass("active-panel");
            $("#detail_set_header").text(paneltitle);
            $(panelId).addClass("active-panel");
        });
        //set control vaules according to brush properties
        $.each( brushOpts, function( key, val ) {
            // console.log(key, val);
            if (key == "taper_min_amount")
            {
                $("#taper_amount")[0].value1 = val;
            }
            else if (key == "taper_max_amount")
            {
                $("#taper_amount")[0].value2 = val;
            }
            else if (key == "blend_mode")
            {
                $("#blend_mode").val(val);
                setBrushAttribute('blend_mode', val);
            }
            else if (key == "grainEffect")
            {
                if (val == 2)
                {
                    $('[data-sub-panel-id="setting_moving"]').removeClass("active");
                    $('[data-sub-panel-id="setting_texture"]').addClass("active");
                }
            }
            else if ($("#sli_" + key)[0] != undefined)
            {
                $("#sli_" + key)[0].value = val;
            }
            else if ($("#" + key)[0] != undefined)
            {
                $("#" + key)[0].checked = val;
            }
        });
    })('previewer');

    $('#previewer').hide();

    var imgs = document.images,
    len = imgs.length,
    counter = 0;

    [].forEach.call( imgs, function( img ) {
        if(img.complete)
            incrementCounter();
        else
            img.addEventListener( 'load', incrementCounter, false );
    } );

    function incrementCounter() {
        counter++;
        if ( counter === len ) {
            console.log( 'All images loaded!' );
            $('#previewer').show();
        }
    }

    $(".close-modal").on("click", function(){
        $(".modal").hide();
    });

    $(".progress-value").on("click", function(){
        let targetSliderId = "sli_" + $(this).children()[0].getAttribute("id");
        let inputLabel = $(this).children()[0].getAttribute("data-label");
        let targetSlider = $("#" + targetSliderId)[0];
        let inputSlider = $("#slider_value_input")[0];
        inputSlider.setAttribute("data_set_target", targetSliderId);
        inputSlider.setAttribute("min", targetSlider.min);
        inputSlider.setAttribute("max", targetSlider.max);
        inputSlider.value = targetSlider.value;
        $("#value_name").text(inputLabel);
        $('#set_value_modal').show();
        let pos = $(this).position();
        $('#set_value_modal')[0].style.left = (pos.left - 250) + "px";
        $('#set_value_modal')[0].style.top = (pos.top + $(this).parent().parent().height()) + "px";
    });

    $("#btn_progress_done").click(function(){
        let inputSlider = $("#slider_value_input")[0];
        let targetSlider = "#" + inputSlider.getAttribute("data_set_target");
        $(targetSlider)[0].value = parseFloat(inputSlider.value);
        $(".modal").hide();
    });

    $('.cancel-btn').click((function() {
        window.location.href = "/";
    }))

    $('.done-btn').click((function() {
        let brushName = localStorage.getItem("CurBrush") || "NewBrush";
        localStorage.setItem(brushName, JSON.stringify(tempBrushOpts));
        window.location.href = "/";
    }))

    $(".btn-colorPanel").on("click", function(){
        $(".btn-colorPanel").removeClass("active");
        var id = "#"+$(this).attr("data-id");
        $(".color-panel").removeClass("active");
        $(id).addClass("active");
        $(this).addClass("active");
    })
})
