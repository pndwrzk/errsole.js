const Jsonapi = require('../utils/jsonapiUtil');
const { getStorageConnection } = require('../storageConnection');
const helpers = require('../utils/helpers');

exports.getLogs = async (req, res) => {
  try {
    const query = req.query || {};
    let searchTerms;
    if (query.search_terms) {
      searchTerms = query.search_terms.split(',');
    }
    if (query.levels) {
      query.levels = query.levels.split(',').map((item) => item.trim());
    }
    if (query.level_json) {
      query.level_json =
        query.level_json && JSON.parse(query.level_json).length === 0
          ? [{}]
          : JSON.parse(query.level_json);
    }
    const storageConnection = getStorageConnection();
    let logs = {};
    if (searchTerms) {
      logs = await storageConnection.searchLogs(searchTerms, query);
    } else {
      logs = await storageConnection.getLogs(query);
    }
    if (logs && logs.items) {
      res.send(Jsonapi.Serializer.serialize(Jsonapi.UserType, logs.items));
    } else {
      const errorData = [
        {
          error: 'Bad Request',
          message: 'invalid request'
        }
      ];
      res.status(400).send({ errors: errorData });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      errors: [
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }
      ]
    });
  }
};

exports.getLogsTTL = async (req, res) => {
  try {
    const storageConnection = getStorageConnection();
    const result = await storageConnection.getConfig('logsTTL');
    if (result && result.item) {
      res.send(Jsonapi.Serializer.serialize(Jsonapi.UserType, result.item));
    } else {
      const errorData = [
        {
          error: 'Bad Request',
          message: 'invalid request'
        }
      ];
      res.status(400).send({ errors: errorData });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      errors: [
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }
      ]
    });
  }
};

exports.updateLogsTTL = async (req, res) => {
  try {
    const { ttl } = helpers.extractAttributes(req.body);
    if (ttl) {
      const storageConnection = getStorageConnection();
      const result = await storageConnection.setConfig('logsTTL', ttl);
      if (result && result.item) {
        await storageConnection.ensureLogsTTL();
        res.send(Jsonapi.Serializer.serialize(Jsonapi.UserType, result.item));
      } else {
        const errorData = [
          {
            error: 'Bad Request',
            message: 'invalid request'
          }
        ];
        res.status(400).send({ errors: errorData });
      }
    } else {
      const errorData = [
        {
          error: 'Bad Request',
          message: 'invalid request'
        }
      ];
      res.status(400).send({ errors: errorData });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({
      errors: [
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        }
      ]
    });
  }
};
