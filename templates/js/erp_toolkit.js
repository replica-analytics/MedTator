/**
 * Easy Rule Pack Toolkit
 * 
 * For more information about the ruleset,
 * Please visit MedTagger website: 
 * https://github.com/OHNLP/MedTagger
 * 
 * And there are also some example rulesets:
 * https://github.com/OHNLP/covid19ruleset
 */
var erp_toolkit = {
    rp: {
        prefix: {
            rsregexp: 'resources_regexp_re'
        }
    },

    ///////////////////////////////////////////////////////
    // Rule Pack Functions
    ///////////////////////////////////////////////////////
    create_new_rulepack: function () {
        return {
            name: '',
            matchrules: [ ],
            rsregexps: [ ],
            contexts: [ ],
            fns: {
                used_resources: 'used_resources.txt',
                resources_rules_matchrules: 'resources_rules_matchrules.txt'
            }
        };
    },

    create_new_matchrule: function () {
        return {
            rule_name: 'cm_fever',
            regexp: '\\b(?i)(?:%reFEVER)\\b',
            location: 'NA',
            enabled: true,
            ignore_case: true,
            norm: 'FEVER'
        };
    },

    create_new_rsregexp: function () {
        return {
            name: 'FEVER',
            text: 'fever\nfebris\nfebrile'
        };
    },

    create_new_context: function() {
        var num = 0;
        if (this.vpp != null) {
            if (this.vpp.rulepack != null) {
                if (typeof(this.vpp.rulepack) != 'undefined') {
                    if (typeof(this.vpp.rulepack.contexts) != 'undefined') {
                        num = this.vpp.rulepack.contexts.length;
                    }
                }
            }
        }
        return {
            name: 'contextRule' + num,
            text: erp_toolkit.MEDTAGGER_CONTEXT_RULE
            // text: 'regex:(^|\s)\?(?=\s?\w+)~|~pre~|~poss~|~1\ndoes not demonstrate~|~pre~|~neg~|~1\ndid not demonstrate~|~pre~|~neg~|~1\ndo not demonstrate~|~pre~|~neg~|~1'
        };
    },

    rulepack2zip: function(rulepack) {
        var zip = new JSZip();

        // create the file list of regexp
        var txt_fns = '';
        for (var i = 0; i < rulepack.rsregexps.length; i++) {
            var rsregexp = rulepack.rsregexps[i];
            var ffn = 'regexp/' + this.rp.prefix.rsregexp + rsregexp.name + '.txt';
            var txt = rsregexp.text;
            txt_fns += './' + ffn + '\n';
            // add to zip
            zip.file(ffn, txt);
            console.log('* add ' + ffn);
        }
        
        // create the context rules
        for (var i = 0; i < rulepack.contexts.length; i++) {
            var context = rulepack.contexts[i];
            var ffn = 'context/' + context.name + '.txt';
            var txt = context.text;
            txt_fns += './' + ffn + '\n';
            // add to zip
            zip.file(ffn, txt);
            console.log('* add ' + ffn);
        }

        // create the rule file
        var rules = '// ' + rulepack.name + '\n';
        for (let i = 0; i < rulepack.matchrules.length; i++) {
            const matchrule = rulepack.matchrules[i];
            rules += 'RULENAME="' + matchrule.rule_name + '",';
            rules += 'REGEXP="' + matchrule.regexp + '",';
            rules += 'LOCATION="' + matchrule.location + '",';
            rules += 'NORM="' + matchrule.norm + '"\n';
        }
        var rule_fn = 'rules/' + rulepack.fns.resources_rules_matchrules;
        txt_fns += './' + rule_fn + '\n';

        zip.file(rule_fn, rules);
        console.log('* add ' + rule_fn);

        // create the used_resources.txt
        txt_fns += './' + rulepack.fns.used_resources + '\n';
        zip.file(rulepack.fns.used_resources, txt_fns);

        return zip;
    },
    
    ///////////////////////////////////////////////////////
    // Easy Pack Functions
    ///////////////////////////////////////////////////////
    create_new_easypack: function(rule_pack_name) {
        if (typeof(rule_pack_name)=='undefined') {
            rule_pack_name = 'rule_pack_name';
        }
        return {
            name: rule_pack_name,
            contexts: [ this.create_new_context() ],
            ergroups: [ ]
        }
    },

    create_new_ergroup: function(norm, text) {
        // set the default norm
        if (typeof(norm) == 'undefined') {
            norm = 'NAME_' + this.mkid(6);
        } else {
            norm = norm.toLocaleUpperCase();
        }

        // set the default text
        if (typeof(text) == 'undefined') {
            text = '';
        }

        return {
            _is_shown: false,
            norm: norm,
            rule_type: 'cm',
            location: 'NA',
            text: text
        };
    },

    anns2text_dict: function(anns) {
        var text_dict = {};

        for (let i = 0; i < anns.length; i++) {
            const ann = anns[i];
            for (let j = 0; j < ann.tags.length; j++) {
                const tag = ann.tags[j];
                // create the tag_def if not exists
                if (!text_dict.hasOwnProperty(tag.tag)) {
                    // the text_dict is for searching
                    // the texts is for storing
                    text_dict[tag.tag] = {
                        textd: {},
                        texts: []
                    };
                }

                // empty text should be removed

                // but first check the text itself
                if (!tag.hasOwnProperty('text')) {
                    // what?
                    continue;
                }

                var text = tag.text;
                text = text.trim();
                if (text == '') {
                    continue;
                }

                if (text_dict[tag.tag].textd.hasOwnProperty(text)) {
                    // oh, this is NOT a new text
                    // just increase the count
                    text_dict[tag.tag].textd[text] += 1;

                } else {
                    // ok, this is a new text
                    // count +1
                    text_dict[tag.tag].textd[text] = 1;

                    // save this tag
                    text_dict[tag.tag].texts.push(text);
                }
            }
        }

        return text_dict;
    },

    anns2easypack: function(anns, dtd) {
        // first, create an empty easypack
        var easypack = this.create_new_easypack(dtd.name);

        // then create ergroup_dict
        var ergroup_dict = {};

        // using the dtd to init the ergroup_dict
        for (let i = 0; i < dtd.etags.length; i++) {
            const tag = dtd.etags[i];
            
            // create a new ergroup from this tag
            var ergroup = this.create_new_ergroup(tag.name, '');

            // put this ergroup to the dict for furture use
            ergroup_dict[tag.name] = ergroup;
        }

        // then, using the anns to fill the text of each ergroup
        var text_dict = this.anns2text_dict(anns);

        // using this text_dict to fill the ergroup_dict
        for (const tag_name in text_dict) {
            if (Object.hasOwnProperty.call(text_dict, tag_name)) {
                // check each text in each tag_name
                for (let k = 0; k < text_dict[tag_name].texts.length; k++) {
                    const text = text_dict[tag_name].texts[k];

                    // just append this text as a new line
                    ergroup_dict[tag_name].text += text + '\n';
                }
            }
        }

        // last, put the ergroup_dict to easypack.ergroups
        for (const tag_name in ergroup_dict) {
            if (Object.hasOwnProperty.call(ergroup_dict, tag_name)) {
                easypack.ergroups.push(ergroup_dict[tag_name]);
            }
        }

        return easypack;
    },

    easypack2rulepack: function(easypack) {
        // create an empty rule pack for converting
        var rulepack = this.create_new_rulepack();
    
        // now update the simple parts according to the easypack
        rulepack.name = easypack.name;
        rulepack.contexts = easypack.contexts;

        // now update the complex parts according to the easypack
        for (let i = 0; i < easypack.ergroups.length; i++) {
            const ergroup = easypack.ergroups[i];
            var regexp_name = this.norm2regexp_name(ergroup.norm);
            var cm_name = regexp_name.toLowerCase();
            
            // create a matchrule
            var matchrule = this.create_new_matchrule();

            // update the matchrule
            // norm is just the norm
            matchrule.norm = ergroup.norm;
            // location is just the location
            matchrule.location = ergroup.location;
            // rule_name is the comb of rule_type and cm_name
            matchrule.rule_name = ergroup.rule_type + '_' + cm_name;
            // regexp is the comb of regexp_name according to the rule_type
            if (ergroup.rule_type == 'cm') {
                matchrule.regexp = '\\b(?i)(?:%re'+regexp_name+')\\b';

            } else if (ergroup.rule_type == 'rem') {
                matchrule.regexp = '\\b(?i)%re'+regexp_name+'\\b';

            } else {
                matchrule.regexp = '\\b(?i)(?:%re'+regexp_name+')\\b';
            }

            // create a rsregexp(?i)
            var rsregexp = this.create_new_rsregexp();

            // update the rsregexp
            rsregexp.name = regexp_name;
            rsregexp.text = ergroup.text;

            // save the new matchrule and rsregexp
            rulepack.matchrules.push(matchrule);
            rulepack.rsregexps.push(rsregexp);
        }

        return rulepack;
    },
    
    ///////////////////////////////////////////////////////
    // Other Functions
    ///////////////////////////////////////////////////////
    mkid: function(length) {
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength)
            );
        }
       return result;
    },

    /**
     * Convert the norm to a valid regexp name
     * 
     * @param {string} norm 
     */
    norm2regexp_name: function(norm) {
        return norm.replace(/_/g, "");
    },

    download_zip: function(zip, fn) {
        zip.generateAsync({ type: "blob" }).then((function(fn){
            return function (content) {
//                saveAs(content, fn);
            }
        })(fn));
    },

    download_anns_as_zip: function(anns, dtd, fn) {
        // first, convert anns to easypack
        var easypack = this.anns2easypack(anns, dtd);

        // second, convert easypack to rulepack
        var rulepack = this.easypack2rulepack(easypack);

        // then convert this easypack to zip
        var zip = this.rulepack2zip(rulepack)

        // last, save this zip
        this.download_zip(zip, fn);

        return rulepack;
    },

    MEDTAGGER_CONTEXT_RULE: `// Format regex:?match_string~|~trigger_type~|~context_type~|~rule_priority(~|~window_size_override)?
// JW added start
regex:\?( ?\w+)?~|~pre~|~poss~|~1
does not demonstrate~|~pre~|~neg~|~1
did not demonstrate~|~pre~|~neg~|~1
do not demonstrate~|~pre~|~neg~|~1
regex:\bdo not see (\S+\s+){1,3}that suggests?\b~|~pre~|~neg~|~2
complications include~|~pre~|~hypo~|~1
complications include,~|~pre~|~hypo~|~1
given some brief thought to~|~pre~|~poss~|~1
never been high enough to cause~|~pre~|~poss~|~1
regex:\bno (\S+\s+){1,3} (to|that) suggests?\b~|~pre~|~neg~|~2
// AW added start
which demonstrates~|~termin~|~poss~|~1
interested in~|~pre~|~poss~|~1
etiology indeterminate~|~pseudo~|~poss~|~1
patient and family~|~pseudo~|~exp~|~1
patient and his husband~|~pseudo~|~exp~|~1
patient and her husband~|~pseudo~|~exp~|~1
patient and his wife~|~pseudo~|~exp~|~1
patient and her wife~|~pseudo~|~exp~|~1
patient and his family~|~pseudo~|~exp~|~1
patient and her family~|~pseudo~|~exp~|~1
patient and husband~|~pseudo~|~exp~|~1
patient and wife~|~pseudo~|~exp~|~1
family in the room~|~pseudo~|~exp~|~1
regex:(query|alternative)(?=\s(\S+\s+){1,3}(versus|vs))~|~pre~|~poss~|~1
does not suggest~|~pre~|~neg~|~2
do not suggest~|~pre~|~neg~|~2
did not suggest~|~pre~|~neg~|~2
not suggest~|~pseudo~|~poss~|~1
investigated for~|~pre~|~poss~|~1
investigating for~|~pre~|~poss~|~1
investigate for~|~pre~|~poss~|~1
regex:\bnot? (\S+\s+){1,5}due\b~|~pseudo~|~neg~|~1
no overt~|~pre~|~poss~|~2
likely due to~|~post~|~poss~|~1
resolution of~|~pre~|~neg~|~1
no progression of the~|~pseudo~|~neg~|~1
because~|~termin~|~neg~|~1
consideration given history~|~post~|~hypo~|~1
considered given history~|~post~|~hypo~|~1
consideration given history~|~pre~|~hist~|~1
considered given history~|~pre~|~hist~|~1
patient had~|~termin~|~neg~|~1
patient had~|~pre~|~hist~|~1
was diagnosed~|~termin~|~neg~|~1
was diagnosed~|~pre~|~hist~|~1
regex:;\b~|~termin~|~neg~|~1
from~|~termin~|~poss~|~1
from~|~termin~|~neg~|~1
maybe~|~pre~|~poss~|~1
no date~|~pseudo~|~neg~|~1
no date:~|~pseudo~|~neg~|~1
not limited~|~pseudo~|~neg~|~1
regex:\bfamily history\s*$~|~post~|~exp~|~2
regex:\bfamily history\s*$~|~post~|~hist~|~2
didn't have~|~pre~|~neg~|~1
don't have~|~pre~|~neg~|~1
never used~|~pre~|~neg~|~1
no question~|~pseudo~|~neg~|~1
her2 negative~|~pseudo~|~neg~|~1
who also had~|~pseudo~|~hypoexp~|~1
symptomatology~|~post~|~poss~|~1
pmhx~|~pre~|~hist~|~1
fmhx~|~pre~|~hist~|~1
fmhx~|~pre~|~exp~|~1
family history~|~pre~|~exp~|~1
family history~|~pre~|~hist~|~1
family member~|~pre~|~exp~|~1
likely to pursue~|~pseudo~|~poss~|~1
likely success~|~pseudo~|~poss~|~1
likely failure~|~pseudo~|~poss~|~1
cousin~|~pre~|~exp~|~1
cousins~|~pre~|~exp~|~1
regex:\basymptomatic\s*$~|~post~|~poss~|~2
// AW added end
//KER added start
trace~|~pre~|~poss~|~1
prn~|~pre~|~hypo~|~1
possible~|~pre~|~hypo~|~1
potential~|~pre~|~poss~|~1
mild~|~pre~|~poss~|~1
will be considered~|~post~|~hypo~|~1
would be considered~|~post~|~hypo~|~1
should be considered~|~post~|~hypo~|~1
considered~|~pre~|~hypo~|~1
consider~|~pre~|~hypo~|~1
consideration~|~pre~|~hypo~|~1
should consider~|~pre~|~hypo~|~1
should have~|~pre~|~hypo~|~1
should be offered~|~pre~|~hypo~|~1
scheduled~|~pre~|~hypo~|~1
planned~|~pre~|~hypo~|~1
plans for~|~pre~|~hypo~|~1
plan for~|~pre~|~hypo~|~1
plans are~|~pre~|~hypo~|~1
candidate for~|~pre~|~hypo~|~1
not a candidate for~|~pre~|~neg~|~1
not be a candidate for~|~pre~|~neg~|~1
put off~|~pre~|~hypo~|~1
    vs ~|~pre~|~hypo~|~1
discuss~|~pre~|~hypo~|~1
discussed~|~pre~|~hypo~|~1
discussion~|~pre~|~hypo~|~1
versus~|~pre~|~hypo~|~1
referred~|~pre~|~hypo~|~1
advised~|~pre~|~hypo~|~1
chance~|~pre~|~hypo~|~1
risky~|~post~|~poss~|~1
recommended~|~post~|~poss~|~1
if experiences worsening~|~pre~|~hypo~|~1
does not have~|~pre~|~neg~|~1
doesn't have~|~pre~|~neg~|~1
doesn't appear to have~|~pre~|~neg~|~1
does not appear to have~|~pre~|~neg~|~1
excluding~|~pre~|~neg~|~1
ruled out~|~pre~|~neg~|~1
differential diagnosis~|~pre~|~poss~|~1
would not want to have~|~pre~|~neg~|~1
decline~|~pre~|~neg~|~1
declined~|~pre~|~neg~|~1
//KER added end
//Sunghwan added start
appear~|~pre~|~poss~|~1
appears~|~pre~|~poss~|~1
suspect~|~pre~|~poss~|~1
suspects~|~pre~|~poss~|~1
//appears? to have~|~pre~|~poss //not working why??
to evaluate~|~pre~|~poss~|~1
indeterminate~|~post~|~poss~|~1
indeterminable~|~pre~|~poss~|~1
to prevent~|~pre~|~hypo~|~1
has been instructed~|~pre~|~hypo~|~1
has been instructed in the sign~|~pre~|~hypo~|~1
has been instructed in the signs~|~pre~|~hypo~|~1
should the patient develop~|~pre~|~hypo~|~1
regex:\bno$~|~post~|~neg~|~1
//Sunghwan added end
//following two not working why??
none current~|~post~|~neg~|~1
no current~|~post~|~neg~|~1
hx~|~pre~|~hist~|~1
previous~|~pre~|~hist~|~1
previously~|~pre~|~hist~|~1
previously undergone~|~pre~|~hist~|~1
after undergoing~|~pre~|~hist~|~1
deny~|~pre~|~neg~|~1
no:~|~pre~|~neg~|~1
no :~|~pre~|~neg~|~1
(no~|~pre~|~neg~|~1
--no~|~pre~|~neg~|~1
don't sound like~|~pre~|~neg~|~1
doesn't sound like~|~pre~|~neg~|~1
regex:-? all of which(\s+\S+){0,3} (denies|denied)\b~|~post~|~neg~|~1
denies any of the following symptoms:~|~pre~|~neg~|~1
denies, however,~|~pre~|~neg~|~1
denies any associated~|~pre~|~neg~|~1
denies any significant~|~pre~|~neg~|~1
precaution for~|~pre~|~poss~|~1
resection of~|~pre~|~hist~|~1
debridement of~|~pre~|~hist~|~1
indication for~|~pre~|~hist~|~1
admitted for~|~pre~|~hist~|~1
likely~|~pre~|~poss~|~1
did deny~|~pre~|~neg~|~1
no source of~|~pre~|~poss~|~1
no source for~|~pre~|~poss~|~1
did not show much of~|~pre~|~poss~|~1
did not show much for~|~pre~|~poss~|~1
no definite finding for~|~pre~|~poss~|~1
no definite finding of~|~pre~|~poss~|~1
no definite findings for~|~pre~|~poss~|~1
no definite findings of~|~pre~|~poss~|~1
concern about~|~pre~|~poss~|~1
concerned about~|~pre~|~poss~|~1
would~|~pre~|~poss~|~1
could have~|~pre~|~poss~|~1
may have~|~pre~|~poss~|~1
raise the question of~|~pre~|~poss~|~1
raise the question for~|~pre~|~poss~|~1
raises the question of~|~pre~|~poss~|~1
raises the question for~|~pre~|~poss~|~1
highly unlikely~|~pre~|~poss~|~1
did not show any~|~pre~|~neg~|~1
do not show any~|~pre~|~neg~|~1
does not show any~|~pre~|~neg~|~1
suspicious for~|~pre~|~poss~|~1
suspicion for~|~pre~|~poss~|~1
suspicious of~|~pre~|~poss~|~1
suspicion of~|~pre~|~poss~|~1
a question of~|~pre~|~poss~|~1
a question for~|~pre~|~poss~|~1
without evidence of~|~pre~|~neg~|~1
without evidence for~|~pre~|~neg~|~1
without sign of~|~pre~|~neg~|~1
without sign for~|~pre~|~neg~|~1
without signs of~|~pre~|~neg~|~1
without signs for~|~pre~|~neg~|~1
did not demonstrate~|~pre~|~neg~|~1
suggests~|~pre~|~poss~|~1
suggest~|~pre~|~poss~|~1
neg of~|~pre~|~neg~|~1
neg for~|~pre~|~neg~|~1
whether~|~pre~|~hypo~|~1
sound more like~|~pre~|~poss~|~1
sound like~|~pre~|~poss~|~1
sounds more like~|~pre~|~poss~|~1
sounds like~|~pre~|~poss~|~1
look more like~|~pre~|~poss~|~1
look like~|~pre~|~poss~|~1
looks more like~|~pre~|~poss~|~1
looks like~|~pre~|~poss~|~1
review the use~|~pre~|~poss~|~1
reviewed~|~pre~|~poss~|~1
likely~|~post~|~poss~|~1
will have~|~pre~|~hypo~|~1
may be~|~pre~|~poss~|~1
for excluding~|~pre~|~poss~|~1
potentially represent~|~pre~|~poss~|~1
possibility of~|~pre~|~poss~|~1
possibility for~|~pre~|~poss~|~1
should symptoms suggesting~|~pre~|~poss~|~1
look for~|~pre~|~hypo~|~1
no evidence of~|~pre~|~neg~|~1
no evidences of~|~pre~|~neg~|~1
no evidence for~|~pre~|~neg~|~1
no evidences for~|~pre~|~neg~|~1
no sign of~|~pre~|~neg~|~1
no sign for~|~pre~|~neg~|~1
no signs of~|~pre~|~neg~|~1
no signs for~|~pre~|~neg~|~1
high-risk that she is at for~|~pre~|~hypo~|~1
high-risk that she is at for~|~pre~|~hypo~|~1
high risk that she is at for~|~pre~|~hypo~|~1
high risk that she is at for~|~pre~|~hypo~|~1
high-risk that the patient is at for~|~pre~|~hypo~|~1
high-risk that the patient is at for~|~pre~|~hypo~|~1
high risk that the patient is at for~|~pre~|~hypo~|~1
high risk that the patient is at for~|~pre~|~hypo~|~1
high-risk that he is at for~|~pre~|~hypo~|~1
high-risk that he is at for~|~pre~|~hypo~|~1
high risk that he is at for~|~pre~|~hypo~|~1
high risk that he is at for~|~pre~|~hypo~|~1
risk of~|~pre~|~hypo~|~1
risk for~|~pre~|~hypo~|~1
risks of~|~pre~|~hypo~|~1
risks for~|~pre~|~hypo~|~1
cardiovascular risk~|~pseudo~|~hypo~|~1
cardiovascular risks~|~pseudo~|~hypo~|~1
risk~|~pre~|~hypo~|~1
risks~|~pre~|~hypo~|~1
s/p~|~pre~|~hist~|~1
at high-risk of~|~pre~|~hypo~|~1
at high-risk for~|~pre~|~hypo~|~1
at high risk of~|~pre~|~hypo~|~1
at high risk for~|~pre~|~hypo~|~1
at risk of~|~pre~|~hypo~|~1
at-risk for~|~pre~|~hypo~|~1
at risk of~|~pre~|~hypo~|~1
at-risk for~|~pre~|~hypo~|~1
re-assess~|~pre~|~hypo~|~1
reassess~|~pre~|~hypo~|~1
assess~|~pre~|~hypo~|~1
prior~|~pre~|~hist~|~1
pmh of~|~pre~|~hist~|~1
pmh for~|~pre~|~hist~|~1
concern~|~pre~|~poss~|~1
concerning~|~pre~|~poss~|~1
is concerned~|~post~|~poss~|~1
is concerned of~|~pre~|~poss~|~1
is concerned for~|~pre~|~poss~|~1
a concern of~|~pre~|~poss~|~1
a concern for~|~pre~|~poss~|~1
is possible~|~post~|~poss~|~1
is probable~|~post~|~poss~|~1
is potentional~|~post~|~poss~|~1
no overt clinical sign of~|~pre~|~neg~|~1
no overt clinical sign for~|~pre~|~neg~|~1
no overt clinical signs of~|~pre~|~neg~|~1
no overt clinical signs for~|~pre~|~neg~|~1
monitor of~|~pre~|~hypo~|~1
monitor for~|~pre~|~hypo~|~1
no source of~|~pre~|~neg~|~1
no source for~|~pre~|~neg~|~1
was ruled out of~|~pre~|~neg~|~1
is ruled out of~|~pre~|~neg~|~1
was ruled out for~|~pre~|~neg~|~1
is ruled out for~|~pre~|~neg~|~1
no evidence of~|~pre~|~neg~|~1
no evidence for~|~pre~|~neg~|~1
was negative of~|~pre~|~neg~|~1
was negative for~|~pre~|~neg~|~1
is negative of~|~pre~|~neg~|~1
is negative for~|~pre~|~neg~|~1
probable~|~pre~|~poss~|~1
possible~|~pre~|~poss~|~1
potential~|~pre~|~poss~|~1
probable for~|~pre~|~poss~|~1
probable of~|~pre~|~poss~|~1
possible of~|~pre~|~poss~|~1
possible for~|~pre~|~poss~|~1
potential of~|~pre~|~poss~|~1
potential for~|~pre~|~poss~|~1
negative~|~pre~|~neg~|~1
is possible~|~post~|~poss~|~1
is probable~|~post~|~poss~|~1
is negative~|~post~|~neg~|~1
was possible~|~post~|~poss~|~1
was probable~|~post~|~poss~|~1
was negative~|~post~|~neg~|~1
regex::\s*no\s*(?:$|[,.!?])~|~post~|~neg~|~2
regex::\s*none\s*(?:$|[,.!?])~|~post~|~neg~|~2
asymptomatic~|~pre~|~poss~|~1
//Hongfang added end
absence of~|~pre~|~neg~|~1
absence for~|~pre~|~neg~|~1
adequate to rule her out~|~pre~|~neg~|~1
adequate to rule him out~|~pre~|~neg~|~1
adequate to rule out~|~pre~|~neg~|~1
adequate to rule the patient out~|~pre~|~neg~|~1
although~|~termin~|~neg~|~1
any other~|~pre~|~neg~|~1
apart from~|~termin~|~neg~|~1
are ruled out~|~post~|~neg~|~1
as a cause of~|~termin~|~neg~|~1
as a cause for~|~termin~|~neg~|~1
as a etiology for~|~termin~|~neg~|~1
as a etiology of~|~termin~|~neg~|~1
as a reason for~|~termin~|~neg~|~1
as a reason of~|~termin~|~neg~|~1
as a secondary cause for~|~termin~|~neg~|~1
as a secondary cause of~|~termin~|~neg~|~1
as a secondary etiology for~|~termin~|~neg~|~1
as a secondary etiology of~|~termin~|~neg~|~1
as a secondary origin for~|~termin~|~neg~|~1
as a secondary origin of~|~termin~|~neg~|~1
as a secondary reason for~|~termin~|~neg~|~1
as a secondary reason of~|~termin~|~neg~|~1
as a secondary source for~|~termin~|~neg~|~1
as a secondary source of~|~termin~|~neg~|~1
as a source for~|~termin~|~neg~|~1
as a source of~|~termin~|~neg~|~1
as a cause for~|~termin~|~neg~|~1
as a cause of~|~termin~|~neg~|~1
as an etiology for~|~termin~|~neg~|~1
as an etiology of~|~termin~|~neg~|~1
as an origin for~|~termin~|~neg~|~1
as an origin of~|~termin~|~neg~|~1
as a reason for~|~termin~|~neg~|~1
as a reason of~|~termin~|~neg~|~1
as a secondary cause for~|~termin~|~neg~|~1
as a secondary cause of~|~termin~|~neg~|~1
as a secondary etiology for~|~termin~|~neg~|~1
as a secondary etiology of~|~termin~|~neg~|~1
as a secondary origin for~|~termin~|~neg~|~1
as a secondary origin of~|~termin~|~neg~|~1
as a secondary reason for~|~termin~|~neg~|~1
as a secondary reason of~|~termin~|~neg~|~1
as a secondary source for~|~termin~|~neg~|~1
as a secondary source of~|~termin~|~neg~|~1
as a source for~|~termin~|~neg~|~1
as a source of~|~termin~|~neg~|~1
as has~|~termin~|~neg~|~1
as needed~|~pre~|~hypo~|~1
as the cause for~|~termin~|~neg~|~1
as the cause of~|~termin~|~neg~|~1
as the etiology for~|~termin~|~neg~|~1
as the etiology of~|~termin~|~neg~|~1
as the origin for~|~termin~|~neg~|~1
as the origin of~|~termin~|~neg~|~1
as the reason for~|~termin~|~neg~|~1
as the reason of~|~termin~|~neg~|~1
as the secondary cause for~|~termin~|~neg~|~1
as the secondary cause of~|~termin~|~neg~|~1
as the secondary etiology for~|~termin~|~neg~|~1
as the secondary etiology of~|~termin~|~neg~|~1
as the secondary origin for~|~termin~|~neg~|~1
as the secondary origin of~|~termin~|~neg~|~1
as the secondary reason for~|~termin~|~neg~|~1
as the secondary reason of~|~termin~|~neg~|~1
as the secondary source for~|~termin~|~neg~|~1
as the secondary source of~|~termin~|~neg~|~1
as the source for~|~termin~|~neg~|~1
as the source of~|~termin~|~neg~|~1
as well as any~|~pre~|~neg~|~1
aside from~|~termin~|~neg~|~1
aunt~|~pre~|~exp~|~1
aunt:~|~pre~|~exp~|~1
aunts~|~pre~|~exp~|~1
aunt's~|~pre~|~exp~|~1
be ruled out~|~post~|~poss~|~1
be ruled out for~|~pre~|~poss~|~1
because~|~termin~|~hypo~|~1
being ruled out~|~post~|~poss~|~1
brother~|~pre~|~exp~|~1
brother:~|~pre~|~exp~|~1
brother's~|~pre~|~exp~|~1
brothers~|~pre~|~exp~|~1
but~|~termin~|~neg~|~1
can be ruled out~|~post~|~neg~|~1
can be ruled out for~|~pre~|~neg~|~1
can rule her out~|~pre~|~neg~|~1
can rule her out against~|~pre~|~neg~|~1
can rule her out for~|~pre~|~neg~|~1
can rule him out~|~pre~|~neg~|~1
can rule him out against~|~pre~|~neg~|~1
can rule him out for~|~pre~|~neg~|~1
can rule out~|~pre~|~neg~|~1
can rule out against~|~pre~|~neg~|~1
can rule out for~|~pre~|~neg~|~1
can rule the patient out~|~pre~|~neg~|~1
can rule the patinet out against~|~pre~|~neg~|~1
can rule the patinet out for~|~pre~|~neg~|~1
cannot~|~pre~|~neg~|~1
cannot exclude~|~pre~|~poss~|~2
cause for~|~termin~|~neg~|~1
cause of~|~termin~|~neg~|~1
causes for~|~termin~|~neg~|~1
causes of~|~termin~|~neg~|~1
checked for~|~pre~|~neg~|~1
clear of~|~pre~|~neg~|~1
come back for~|~pre~|~hypo~|~1
come back to~|~pre~|~hypo~|~1
complains~|~termin~|~histexp~|~1
could be ruled out~|~post~|~poss~|~1
//could be~|~both~|~poss~|~1
could be ruled out for~|~pre~|~poss~|~1
currently~|~termin~|~histexp~|~1
dad~|~pre~|~exp~|~1
dad:~|~pre~|~exp~|~1
dad's~|~pre~|~exp~|~1
declined~|~pre~|~neg~|~1
declines~|~pre~|~neg~|~1
denied~|~pre~|~neg~|~1
denies~|~pre~|~neg~|~1
denying~|~pre~|~neg~|~1
did not rule out~|~post~|~poss~|~1
did rule her out~|~pre~|~neg~|~1
did rule her out against~|~pre~|~neg~|~1
did rule her out for~|~pre~|~neg~|~1
did rule him out~|~pre~|~neg~|~1
did rule him out against~|~pre~|~neg~|~1
did rule him out for~|~pre~|~neg~|~1
did rule out~|~pre~|~neg~|~1
did rule out against~|~pre~|~neg~|~1
did rule out for~|~pre~|~neg~|~1
did rule the patient out~|~pre~|~neg~|~1
did rule the patient out against~|~pre~|~neg~|~1
did rule the patient out for~|~pre~|~neg~|~1
doesn't look like~|~pre~|~neg~|~1
ed~|~termin~|~hist~|~1
emergency department~|~termin~|~hist~|~1
etiology for~|~termin~|~neg~|~1
etiology of~|~termin~|~neg~|~1
evaluate for~|~pre~|~neg~|~1
evaluation for~|~pre~|~neg~|~1
except~|~termin~|~neg~|~1
fails to reveal~|~pre~|~neg~|~1
family~|~pre~|~exp~|~1
fam hx~|~pre~|~exp~|~1
fam hx:~|~pre~|~exp~|~1
father~|~pre~|~exp~|~1
father:~|~pre~|~exp~|~1
father's~|~pre~|~exp~|~1
free~|~post~|~neg~|~1
free of~|~pre~|~neg~|~1
gram negative~|~pseudo~|~neg~|~1
grandfather~|~pre~|~exp~|~1
grandfather's~|~pre~|~exp~|~1
grandfather:~|~pre~|~exp~|~1
grandmother~|~pre~|~exp~|~1
grandmother's~|~pre~|~exp~|~1
grandmother:~|~pre~|~exp~|~1
has been negative~|~post~|~neg~|~1
has been ruled out~|~post~|~neg~|~1
have been ruled out~|~post~|~neg~|~1
her~|~termin~|~hypoexp~|~1
his~|~termin~|~hypoexp~|~1
hx of~|~pre~|~hist~|~1
h/o~|~pre~|~hist~|~1
statuspost~|~pre~|~hist~|~1
status/post~|~pre~|~hist~|~1
status-post~|~pre~|~hist~|~1
status post~|~pre~|~hist~|~1
year ago~|~pre~|~hist~|~1
year ago~|~post~|~hist~|~1
years ago~|~pre~|~hist~|~1
years ago~|~post~|~hist~|~1
have had~|~pre~|~hist~|~1
has had~|~pre~|~hist~|~1
had~|~pre~|~hist~|~1
underwent~|~pre~|~hist~|~1
husband~|~pre~|~exp~|~1
ho~|~pre~|~hist~|~1
history~|~pre~|~hist~|~1
history of~|~pre~|~hist~|~1
history and~|~pseudo~|~hist~|~1
history and examination~|~pseudo~|~hist~|~1
history and physical~|~pseudo~|~hist~|~1
history for~|~pseudo~|~hist~|~1
history of chief complaint~|~pseudo~|~hist~|~1
history of present illness~|~pseudo~|~hist~|~1
history taking~|~pseudo~|~hist~|~1
history, physical~|~pseudo~|~hist~|~1
however~|~termin~|~neg~|~1
if~|~pre~|~hypo~|~1
if negative~|~pseudo~|~hypo~|~1
inconsistent with~|~pre~|~neg~|~1
is not~|~pre~|~neg~|~1
is ruled out~|~post~|~neg~|~1
is to be ruled out~|~post~|~poss~|~1
is to be ruled out for~|~pre~|~poss~|~1
isn't~|~pre~|~neg~|~1
lack of~|~pre~|~neg~|~1
lacked~|~pre~|~neg~|~1
may be ruled out~|~post~|~poss~|~1
may be ruled out for~|~pre~|~poss~|~1
discussed~|~pre~|~poss~|~1
might be ruled out~|~post~|~poss~|~1
might be ruled out for~|~pre~|~poss~|~1
mom~|~pre~|~exp~|~1
mom:~|~pre~|~exp~|~1
mom's~|~pre~|~exp~|~1
mother~|~pre~|~exp~|~1
mother:~|~pre~|~exp~|~1
mother's~|~pre~|~exp~|~1
must be ruled out~|~post~|~poss~|~1
must be ruled out for~|~pre~|~poss~|~1
negative for~|~pre~|~neg~|~1
never developed~|~pre~|~neg~|~1
never had~|~pre~|~neg~|~1
nevertheless~|~termin~|~neg~|~1
no~|~pre~|~neg~|~1
no abnormal~|~pre~|~neg~|~1
no cause of~|~pre~|~neg~|~1
no change~|~pseudo~|~neg~|~1
no complaints of~|~pre~|~neg~|~1
no definite change~|~pseudo~|~neg~|~1
no evidence~|~pre~|~neg~|~1
no evidence to suggest~|~pre~|~neg~|~1
no findings of~|~pre~|~neg~|~1
no findings to indicate~|~pre~|~neg~|~1
no history of~|~pre~|~neg~|~1
no increase~|~pseudo~|~neg~|~1
no interval change~|~pseudo~|~neg~|~1
no longer present~|~post~|~neg~|~1
no mammographic evidence of~|~pre~|~neg~|~1
no new~|~pre~|~neg~|~1
no new evidence~|~pre~|~neg~|~1
no other evidence~|~pre~|~neg~|~1
no radiographic evidence of~|~pre~|~neg~|~1
no sign of~|~pre~|~neg~|~1
no significant~|~pre~|~neg~|~1
no significant change~|~pseudo~|~neg~|~1
no significant interval change~|~pseudo~|~neg~|~1
no signs of~|~pre~|~neg~|~1
no suggestion of~|~pre~|~neg~|~1
no suspicious~|~pre~|~neg~|~1
no suspicious change~|~pseudo~|~neg~|~1
non diagnostic~|~post~|~neg~|~1
not~|~pre~|~neg~|~1
not appear~|~pre~|~neg~|~1
not appreciate~|~pre~|~neg~|~1
not associated with~|~pre~|~neg~|~1
not been ruled out~|~post~|~poss~|~1
not cause~|~pseudo~|~neg~|~1
not certain if~|~pseudo~|~neg~|~1
not certain whether~|~pseudo~|~neg~|~1
not complain of~|~pre~|~neg~|~1
not demonstrate~|~pre~|~neg~|~1
not drain~|~pseudo~|~neg~|~1
not exhibit~|~pre~|~neg~|~1
not extend~|~pseudo~|~neg~|~1
not feel~|~pre~|~neg~|~1
not had~|~pre~|~neg~|~1
not have~|~pre~|~neg~|~1
not have evidence of~|~pre~|~neg~|~1
not know of~|~pre~|~neg~|~1
not known to have~|~pre~|~neg~|~1
not necessarily~|~pseudo~|~neg~|~1
not on~|~pseudo~|~neg~|~1
not only~|~pseudo~|~neg~|~1
not recommended~|~post~|~neg~|~1
not recommend~|~pre~|~neg~|~1
not recommending~|~pre~|~neg~|~1
not reveal~|~pre~|~neg~|~1
not ruled out~|~post~|~poss~|~1
not see~|~pre~|~neg~|~1
not to be~|~pre~|~neg~|~1
nothing to suggest~|~pre~|~neg~|~2
noted~|~termin~|~histexp~|~1
now resolved~|~post~|~neg~|~1
origin for~|~termin~|~neg~|~1
origin of~|~termin~|~neg~|~1
origins for~|~termin~|~neg~|~1
origins of~|~termin~|~neg~|~1
other possibilities of~|~termin~|~neg~|~1
ought to be ruled out~|~post~|~poss~|~1
ought to be ruled out for~|~pre~|~poss~|~1
past history~|~pre~|~hist~|~1
past~|~pre~|~hist~|~1
following up~|~pre~|~hist~|~1
following~|~pre~|~hist~|~1
received~|~pre~|~hist~|~1
past medical history~|~pre~|~hist~|~1
patient~|~termin~|~hypoexp~|~1
patient was not~|~pre~|~neg~|~1
patient's~|~termin~|~hypoexp~|~1
poor history~|~pseudo~|~hist~|~1
presenting~|~termin~|~histexp~|~1
presents~|~termin~|~histexp~|~1
prophylaxis~|~post~|~neg~|~1
r/o~|~pre~|~neg~|~1
rather than~|~pre~|~neg~|~1
reason for~|~termin~|~neg~|~1
reason of~|~termin~|~neg~|~1
reasons for~|~termin~|~neg~|~1
reasons of~|~termin~|~neg~|~1
reported~|~termin~|~histexp~|~1
reports~|~termin~|~histexp~|~1
resolved~|~pre~|~neg~|~1
resolved after~|~post~|~neg~|~1
return~|~pre~|~hypo~|~1
ro~|~pre~|~neg~|~1
rule her out~|~pre~|~neg~|~1
rule her out for~|~pre~|~neg~|~1
rule him out~|~pre~|~neg~|~1
rule him out for~|~pre~|~neg~|~1
rule out~|~pre~|~neg~|~1
rule out for~|~pre~|~neg~|~1
rule the patient out~|~pre~|~neg~|~1
rule the patinet out for~|~pre~|~neg~|~1
ruled her out~|~pre~|~neg~|~1
ruled her out against~|~pre~|~neg~|~1
ruled her out for~|~pre~|~neg~|~1
ruled him out~|~pre~|~neg~|~1
ruled him out against~|~pre~|~neg~|~1
ruled him out for~|~pre~|~neg~|~1
ruled out~|~pre~|~neg~|~1
ruled out against~|~pre~|~neg~|~1
ruled out for~|~pre~|~neg~|~1
ruled the patient out~|~pre~|~neg~|~1
ruled the patient out against~|~pre~|~neg~|~1
ruled the patient out for~|~pre~|~neg~|~1
rules her out~|~pre~|~neg~|~1
rules her out for~|~pre~|~neg~|~1
rules him out~|~pre~|~neg~|~1
rules him out for~|~pre~|~neg~|~1
rules out~|~pre~|~neg~|~1
rules out for~|~pre~|~neg~|~1
rules the patient out~|~pre~|~neg~|~1
rules the patient out for~|~pre~|~neg~|~1
secondary~|~termin~|~neg~|~1
secondary to~|~termin~|~neg~|~1
should be ruled out~|~post~|~neg~|~1
should be ruled out for~|~pre~|~neg~|~1
should he~|~pre~|~hypo~|~1
should she~|~pre~|~hypo~|~1
should the patient~|~pre~|~hypo~|~1
should there~|~pre~|~hypo~|~1
since~|~termin~|~hypo~|~1
sister~|~pre~|~exp~|~1
sister's~|~pre~|~exp~|~1
social history~|~pseudo~|~hist~|~1
son~|~pre~|~exp~|~1
source for~|~termin~|~neg~|~1
source of~|~termin~|~neg~|~1
sources for~|~termin~|~neg~|~1
sources of~|~termin~|~neg~|~1
states~|~termin~|~histexp~|~1
still~|~termin~|~neg~|~1
sudden onset of~|~pseudo~|~hist~|~1
sufficient to rule her out~|~pre~|~neg~|~1
sufficient to rule her out against~|~pre~|~neg~|~1
sufficient to rule her out for~|~pre~|~neg~|~1
sufficient to rule him out~|~pre~|~neg~|~1
sufficient to rule him out against~|~pre~|~neg~|~1
sufficient to rule him out for~|~pre~|~neg~|~1
sufficient to rule out~|~pre~|~neg~|~1
sufficient to rule out against~|~pre~|~neg~|~1
sufficient to rule out for~|~pre~|~neg~|~1
sufficient to rule the patient out~|~pre~|~neg~|~1
sufficient to rule the patient out against~|~pre~|~neg~|~1
sufficient to rule the patient out for~|~pre~|~neg~|~1
test for~|~pre~|~neg~|~1
though~|~termin~|~neg~|~1
to exclude~|~pre~|~neg~|~1
today~|~termin~|~histexp~|~1
trigger event for~|~termin~|~neg~|~1
uncle~|~pre~|~exp~|~1
uncle:~|~pre~|~exp~|~1
uncle's~|~pre~|~exp~|~1
unlikely~|~post~|~neg~|~1
unremarkable for~|~pre~|~neg~|~1
was found~|~termin~|~histexp~|~1
was negative~|~post~|~neg~|~1
was not~|~pre~|~neg~|~1
was ruled out~|~post~|~neg~|~1
wasn't~|~pre~|~neg~|~1
what must be ruled out is~|~pre~|~poss~|~1
which~|~termin~|~exp~|~1
wife~|~pre~|~exp~|~1
who~|~termin~|~hypoexp~|~1
will be ruled out~|~post~|~poss~|~1
will be ruled out for~|~pre~|~poss~|~1
with no~|~pre~|~neg~|~1
without~|~pre~|~neg~|~1
without any evidence of~|~pre~|~neg~|~1
without difficulty~|~pseudo~|~neg~|~1
without evidence~|~pre~|~neg~|~1
without indication of~|~pre~|~neg~|~1
without sign of~|~pre~|~neg~|~1
yet~|~termin~|~neg~|~1
    `
};