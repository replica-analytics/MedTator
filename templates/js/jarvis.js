/**
 * A manager for all kinds of tasks that we don't want core app to do
 * 
 * Hey Jarvis! It's not a voice command assistant.
 */
var jarvis = {
    // for annotating test
    sample_text: {},

    // for log
    changelog_latest: '',

    init: function() {
        // too bad ...
        if (isIE) { 
            this.ssmsg(_NOT_SUPPORT_MSG);
            return 0; 
        }

        app_hotpot.init();

        if (isCHROME) { 

            if (isFSA_API_OK) {
                jarvis.ssmsg('Initializated')
                setTimeout('jarvis.ssclose();', 500);

            } else {
                // this can be many reasons
                if (isHTTPS) {
                    // 2022-03-24: Thanks to Adam Cross@UIC who reported this bug!
                    jarvis.ssmsg(_DISABLED_API_MSG);

                } else if (isLOCALFILE) {
                    // 2022-03-24: Thanks to Adam Cross@UIC who reported this bug!
                    jarvis.ssmsg(_DISABLED_API_MSG);

                } else if (!isLOCALHOST) {
                    // not HTTPs and not localhost
                    // so can not use FSA API
                    jarvis.ssmsg(_SEC_LMT_MSG);

                } else {
                    // ?
                    jarvis.ssmsg(_DISABLED_API_MSG);
                }
            }
        } else {

            if (isFSA_API_OK) {
                jarvis.ssmsg('Initializated')
                setTimeout('jarvis.ssclose();', 500);
                
            } else {
                jarvis.ssmsg(_LMT_SUPPORT_MSG);
            }

        }

        $(window).resize(function() {
            app_hotpot.resize();
        });

        // get some settings here

        // the default sample dataset for demo
        var sample_ds = this.get_url_paramter('ds');
        if (sample_ds == '') {
            sample_ds = 'MINIMAL_TASK';
        }

        // show sample dataset at beginning or not
        var show_sample = this.get_url_paramter('ss');
        if (show_sample == 'yes') {
            app_hotpot.vpp.load_sample_ds(sample_ds);
        }

        // show the tour?
        var show_tour = this.get_url_paramter('st');
        if (show_tour == 'yes') {
            setTimeout('app_hotpot.start_tour_annotation();', 550);
        }
    },

    get_url_paramter: function(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        var results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },

    ssmsg: function(msg) {
        $('#ss-msg').html(msg);
    },

    ssclose: function() {
        $('#start-screen').hide();
    },

    save_json: function(obj, fn) {
        var json_text = JSON.stringify(obj, null, 4);
        var blob = new Blob([json_text], {type: "text/json;charset=utf-8"});
        // saveAs(blob, fn);

        // Initialize AWS SDK with your credentials
        AWS.config.update({
            accessKeyId: 'ACCESS_KEY', //AWS access key
            secretAccessKey: 'SECRET_KEY' //AWS secret key

         });
        const s3 = new AWS.S3();
        // Generate a unique document name (e.g., using a timestamp)
        const timestamp = new Date().getTime();
        const documentName = `vpp_SAVED_JSON_${timestamp}.json`;
        // Assuming you have tsv data in the 'tsv' variable
        const params = {
                    Bucket: 'AWS_S3_BUCKET_NAME', // Replace with your S3 bucket and packet folder
                    Key: documentName, // Replace with desired S3 file path
                    Body: json_text,
                    ContentType: 'application/json'
        };
         // Set CORS headers for the S3 upload request
         const corsHeaders = {
          'x-amz-acl': 'public-read', // Optional: Set ACL if needed
             'Access-Control-Allow-Origin': 'ORIGIN_WEB_PAGE' // Match the origin where your web page is hosted
                };
        params.Metadata = corsHeaders;
        s3.upload(params, (err, data) => {
                    if (err) {
                        console.error('Error uploading JSON data to S3:', err);
                    } else {
                        console.log('JSON data uploaded successfully to S3:', data.Location);
                    }
                });
    },

    save_vpp_as: function(name) {
        if (app_hotpot.vpp.$data.dtd == null) {
            console.log('* no dtd yet');
            return;
        }
        var dtd_name = app_hotpot.vpp.$data.dtd.name;

        if (typeof(name) == 'undefined') {
            name = dtd_name;
        }

        // change to upper case for better looking
        name = name.toLocaleUpperCase();

        // save it!
        this.save_json(
            app_hotpot.vpp.$data,
            'vpp_data_'+name+'.json'
        );
    }
}