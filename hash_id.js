const crypto = require('crypto');

const get_new_hash_id = (program_name) => {
	const current_date = (new Date()).valueOf().toString();
	const random = Math.random().toString();
	const hash = crypto.createHash('sha1').update(current_date + random + program_name).digest('hex');
	return hash;
};

exports.get_new_hash_id = get_new_hash_id;
