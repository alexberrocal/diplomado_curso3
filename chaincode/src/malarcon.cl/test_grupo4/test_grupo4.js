'use strict';
const shim = require('fabric-shim');

let logger = null;

let Chaincode = class {

	constructor() {
		// Force context binding for functions
		this.iterateThroughQuery = this.iterateThroughQuery.bind(this);
        this.iterateThroughQuerytoJSON = this.iterateThroughQuerytoJSON.bind(this);
        this.validarEntidad = this.validarEntidad.bind(this);
        this.queryAllORGS = this.queryAllORGS.bind(this);
        this.queryAllRequest = this.queryAllRequest.bind(this);
        this.queryAllSend = this.queryAllSend.bind(this);
        this.createRequireRequest = this.createRequireRequest.bind(this);
        this.createSendRequest = this.createSendRequest.bind(this);
        this.receiveCash = this.receiveCash.bind(this);
        this.sendCash = this.sendCash.bind(this);
		this.queryEntity = this.queryEntity.bind(this);
	}

	// The Init method is called when the Smart Contract is instantiated by the blockchain network
	// Best practice is to have any Ledger initialization in separate function -- see initLedger()
	async Init(stub) {
		logger = shim.newLogger('NODE_TEST_GRUPO4');
		logger.level = 'debug';

		logger.info('=========== Instantiated bcs-test chaincode ===========');
		return shim.success();
	}

	// The Invoke method is called as a result of an application request to run the Smart Contract.
	// The calling application program has also specified the particular smart contract
	// function to be called, with arguments
	async Invoke(stub) {
		let ret = stub.getFunctionAndParameters();
		logger.info(ret);

		let method = this[ret.fcn];
		if (!method) {
			logger.error('no function of name:' + ret.fcn + ' found');
			throw new Error('Received unknown function ' + ret.fcn + ' invocation');
		}
		try {
			let payload = await method(stub, ret.params);
			logger.debug('Payload is: ', payload);
			if (!payload) {
				payload = Buffer.from(JSON.stringify(ret.params));
			}
			return shim.success(payload);
		} catch (err) {
			logger.error(err);
			return shim.error(err);
		}
	}

	async ping(stub) {
		return Buffer.from('pong');
	}

	async queryCustomer(stub, args) {
		if (args.length != 1) {
			throw new Error('Incorrect number of arguments. Expecting RUT ex: 1-9');
		}
		let rut = args[0];

		let customerAsBytes = await stub.getState(rut); //get the customer from chaincode state
		if (!customerAsBytes || customerAsBytes.toString().length <= 0) {
			throw new Error('Customer RUT ' + rut + ' does not exist');
		}
		logger.debug(customerAsBytes.toString());
		return customerAsBytes;
	}

	async initLedger(stub, args) {
		logger.info('============= START : Initialize Ledger ===========');
		let entities = [];
		entities.push({
            code: 'BRINKS',
			name: 'Brinks',
			amount: 100,
			type: 'ETV',
			status: 'ACTIVE',
            type_entity: 'ORGS'
		});
		entities.push({
            code: 'BANCO_FALABELLA',
			name: 'Banco Falabella',
			amount: 100,
			type: 'BANCO',
			status: 'ACTIVE',
            type_entity: 'ORGS'
		});
        entities.push({
			code: 'BANCO_CHILE',
			name: 'BANCO CHILE',
			amount: 100,
			type: 'BANCO',
			status: 'ACTIVE'
		});
		entities.push({
			code: 'FALABELLA_RETAIL',
			name: 'Tienda Falabella',
			amount: 100,
			type: 'RETAIL',
			status: 'ACTIVE',
            type_entity: 'ORGS'
		});
        entities.push({
			code: 'RIPLEY_RETAIL',
			name: 'Tienda Ripley',
			amount: 100,
			type: 'RETAIL',
			status: 'ACTIVE',
            type_entity: 'ORGS'
		});
        entities.push({
			code: 'ATM_1',
			name: 'ATM 1',
			amount: 100,
			type: 'ATM',
			status: 'ACTIVE',
            type_entity: 'ORGS'
		});
        entities.push({
			code: 'ATM_2',
			name: 'ATM 2',
			amount: 0,
			type: 'ATM',
			status: 'ACTIVE',
            type_entity: 'ORGS'
		});


		for (let i = 0; i < entities.length; i++) {
			let c = entities[i];
			await stub.putState(c.code, Buffer.from(JSON.stringify(c)));
			logger.info('Added <--> ', c);
		}

		logger.info('============= END : Initialize Ledger ===========');
	}

    async queryAllORGS(stub, args) {
		logger.info('============= START : Query all ORGS ===========');
		
        let jsonSnip = {
            "selector":{
                "type_entity":"ORGS"
            }
        };
        
		let iterator = await stub.getQueryResult(JSON.stringify(jsonSnip));
        let out = await this.iterateThroughQuerytoJSON(iterator);
        return Buffer.from(JSON.stringify(out));
	}

    async queryAllRequest(stub) {
		logger.info('============= START : Query all Request ===========');
		
        let jsonSnip = {
            "selector":{
                "type":"request"
            }
        };
        
		let iterator = await stub.getQueryResult(JSON.stringify(jsonSnip));
        let out = await this.iterateThroughQuerytoJSON(iterator);
        return Buffer.from(JSON.stringify(out));
	}

    async queryAllSend(stub) {
		logger.info('============= START : Query all Send ===========');
		
        let jsonSnip = {
            "selector":{
                "type":"send"
            }
        };
        
		let iterator = await stub.getQueryResult(JSON.stringify(jsonSnip));
        let out = await this.iterateThroughQuerytoJSON(iterator);
        return Buffer.from(JSON.stringify(out));
	}

    async createRequireRequest(stub, args) {
        logger.info('============= START : requireCash Contract ===========');
    
        if (args.length != 3) {
          throw new Error('Incorrect number of arguments. Expecting 3');
        }

        let code = args[0];
        let requester = args[1];
        let amount = args[2];

        let entityRequesterAsBytes = await stub.getState(requester);

        if(!this.validarEntidad(entityRequesterAsBytes)) {
            throw new Error('Solicitante no existe.');
        }

        if(Number(amount) < 0){
            throw new Error('Monto debe ser mayor a cero.');
        }

        let request = {
            code : code,
            requester : requester,
            type: 'request',
            amount: amount,
            status: 'ACTIVE'
        }
    
        await stub.putState(code, Buffer.from(JSON.stringify(request)));
        logger.info('============= END : requireCash Contract ===========');
    }
    
    async createSendRequest(stub, args){
        logger.info('============= START : sendCash Contract ===========');

        if (args.length != 4) {
            throw new Error('Incorrect number of arguments. Expecting 4');
        }

        let code = args[0];
        let sender = args[1];
        let receiver = args[2];
        let amount = args[3];

        let entitySenderAsBytes = await stub.getState(sender);
        let entityReceiverAsBytes = await stub.getState(receiver);
        
        if(!this.validarEntidad(entitySenderAsBytes)) {
            throw new Error('Solicitante de retiro no existe.');
        }

        if(!this.validarEntidad(entityReceiverAsBytes)) {
            throw new Error('Destino no existe.');
        }

        if(Number(amount) < 0){
            throw new Error('Monto debe ser mayor a cero.');
        }

        let send = {
            code : code,
            sender : sender,
            receiver : receiver,
            type: 'send',
            amount: amount,
            status: 'ACTIVE'
        }

        await stub.putState(code, Buffer.from(JSON.stringify(send)));
        logger.info('============= END : sendCash Contract ===========');
    }

    async receiveCash(stub, args) {
		logger.info('============= START : Add Cash ===========');
		if (args.length != 2) {
			throw new Error('Incorrect number of arguments. Expecting 2');
		}
        let code = args[0];
        let requestAsBytes = await stub.getState(code);
        if(!this.validarEntidad(requestAsBytes)){
            throw new Error('Solicitud no existe.');
        }
        let request = JSON.parse(requestAsBytes);
		let code_etv = args[1];
		let entityETVAsBytes = await stub.getState(code_etv);
        let code_requester = request.requester;
		let entityRequesterAsBytes = await stub.getState(code_requester);
        if(!this.validarEntidad(entityETVAsBytes)) {
            throw new Error('ETV no existe.');
        }
        if(!this.validarEntidad(entityRequesterAsBytes)) {
            throw new Error('Entidad solicitante no existe.');
        }
		let etv = JSON.parse(entityETVAsBytes);
        let requester = JSON.parse(entityRequesterAsBytes);
        let amount = Number(request.amount);

        if(etv.type !== 'ETV') {
            throw new Error('Entidad no es ETV.');
        }

        if(etv.amount < amount) {
            throw new Error('Saldo insuficiente en ETV.');
        }

		etv.amount -= amount;
        requester.amount += amount;
        request.status = 'DONE';

		await stub.putState(code_etv, Buffer.from(JSON.stringify(etv)));
        await stub.putState(code_requester, Buffer.from(JSON.stringify(requester)));
        await stub.putState(code, Buffer.from(JSON.stringify(request)));
		logger.info('============= END : Add addCash ===========');
	}

    async sendCash(stub, args) {
		logger.info('============= START : Send Cash ===========');
		if (args.length != 1) {
			throw new Error('Incorrect number of arguments. Expecting 1');
		}
        let code = args[0];
        let requestAsBytes = await stub.getState(code);
        if(!this.validarEntidad(requestAsBytes)){
            throw new Error('Solicitud no existe.');
        }
        let request = JSON.parse(requestAsBytes);

		let code_sender = request.sender;
		let entitySenderAsBytes = await stub.getState(code_sender);
        let code_receiver = request.receiver;
		let entityReceiverAsBytes = await stub.getState(code_receiver);
        if(!this.validarEntidad(entitySenderAsBytes)) {
            throw new Error('Origen no existe.');
        }

        if(!this.validarEntidad(entityReceiverAsBytes)) {
            throw new Error('Destino no existe.');
        }
		let sender = JSON.parse(entitySenderAsBytes);
        let receiver = JSON.parse(entityReceiverAsBytes);
        let amount = Number(request.amount);

        if(sender.amount < amount) {
            throw new Error('Saldo insuficiente en Origen.');
        }

		sender.amount -= amount;
        receiver.amount += amount;
        request.status = 'DONE';

		await stub.putState(code_sender, Buffer.from(JSON.stringify(sender)));
        await stub.putState(code_receiver, Buffer.from(JSON.stringify(receiver)));
        await stub.putState(code, Buffer.from(JSON.stringify(request)));
		logger.info('============= END : Add addCash ===========');
	}

	// iterateThroughQuery takes in an iterator object and returns a string of all
	// records in the set
	async iterateThroughQuery(iter) {
		let res = {};
		let outArray = [];
		while (!res.done) {
			res = await iter.next();
			if (res.value && res.value.value)
				outArray.push(res.value.value.toString('utf8'));
		}
		await iter.close();
		if (outArray.length === 0) {
			logger.debug('No record found');
			return Buffer.from('No record found');
		}

		return Buffer.from(JSON.stringify(outArray));
	}

    async iterateThroughQuerytoJSON(iter) {
		let res = {};
		let outArray = [];
		while (!res.done) {
			res = await iter.next();
			if (res.value && res.value.value)
				outArray.push(JSON.parse(res.value.value.toString('utf8')));
		}
		await iter.close();
		if (outArray.length === 0) {
			logger.debug('No record found');
			return Buffer.from('No record found');
		}

		return outArray;
	}

	async queryEntity(stub, args) {
		logger.info('============= START : Query Customers ===========');
		const jsonSnip = args[0];

		logger.debug('Beginning rich query');
		logger.debug('Search by: ', jsonSnip);

		//create iterator from selector key
		let partialIterator = await stub.getQueryResult(jsonSnip);
		//return all keys
		let out = await this.iterateThroughQuery(partialIterator);

		logger.debug('Rich Query Complete');
		logger.debug(out);
		return out;
	}

    validarEntidad(entidad){
        try {
            return JSON.parse(entidad);
        } catch(e){
            return false;
        }
    }
};

shim.start(new Chaincode());