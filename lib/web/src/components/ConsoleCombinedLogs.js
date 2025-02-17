/* imports modules */
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import moment from 'moment';
import Cookies from 'universal-cookie';
import ReactJson from 'react-json-view';

/* Ante UI */
import { Layout, Icon, Collapse, Dropdown, Button, Spin, notification, Modal, Menu, Descriptions, message } from 'antd';

/* import actions */
import * as logActions from 'actions/logActions.js';
const cookies = new Cookies();
const { Content } = Layout;
const { Panel } = Collapse;

/* mapStateToProps */
const mapStateToProps = (state, ownProps) => {
  return Object.assign({}, ownProps, {
    userId: state.userProfileReducer.get('userId'),
    userProfile: state.userProfileReducer.get('userProfile')
  });
};

const mapDispatchToProps = (dispatch) => ({
  logActions: bindActionCreators(logActions, dispatch)
});

class ConsoleCombinedLogs extends React.Component {
  constructor (props) {
    super(props);
    const errorLogTimestamp = this.props.errorLogTimestamp;
    const errorLogId = this.props.errorLogId;
    const timezone = cookies.get('errsole-timezone-preference');

    this.state = {
      errorLogTimestamp,
      errorLogId,
      consoleCombinedLogLoading: false,
      combinedLogs: [],
      timezone
    };
  }

  componentDidMount () {
    const errorLogTimestamp = this.state.errorLogTimestamp;
    if (errorLogTimestamp) {
      this.getConsoleCombinedLogs({ datetime: errorLogTimestamp, logOrder: 'old' });
    }
  }

  getConsoleCombinedLogs (queryRequest) {
    const self = this;
    const query = {};
    if (queryRequest && queryRequest.logOrder) {
      //
      if (!queryRequest || (queryRequest && !queryRequest.logId)) {
        if (queryRequest && queryRequest.datetime) {
          query.lte_timestamp = new Date(queryRequest.datetime).toISOString();
        }
      }
      // get latest logs
      if (queryRequest && queryRequest.logId) {
        if (queryRequest.logOrder === 'old') {
          query.lt_id = queryRequest.logId;
        }
        if (queryRequest.logOrder === 'latest') {
          query.gt_id = queryRequest.logId;
        }
      }
      self.setState({
        consoleCombinedLogLoading: true
      });
      this.props.logActions.getConsoleLogs(query, function (err, data) {
        if (!err) {
          try {
            const logs = data.data || [];
            if (logs.length === 0) {
              self.notificationMsg('info', 'No logs to load');
            } else {
              const TotalLogs = self.sortLogs(logs);
              self.setState({
                combinedLogs: TotalLogs
              });
              setTimeout(function () {
                if (logs.length > 0 && TotalLogs.length === logs.length) {
                  const element = document.getElementsByClassName('selected_error_log_panel')[0];
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }, 300);
            }
          } catch (e) {
            console.error(e);
            self.notificationMsg();
          }
        } else {
          self.notificationMsg();
        }
        self.setState({
          consoleCombinedLogLoading: false
        });
      });
    } else {
      message.error('Something went wrong');
    }
  }

  sortLogs (latest) {
    const old = this.state.combinedLogs;
    const combined = old.concat(latest);
    const updatedConsoleLogs = combined.filter((value, index, self) => {
      return !self.slice(index + 1).some(item => item.id === value.id);
    });
    updatedConsoleLogs.sort((a, b) => new Date(a.attributes.timestamp) - new Date(b.attributes.timestamp));
    return updatedConsoleLogs;
  }

  notificationMsg (type = 'info', message = 'Something went wrong. Please report the issue using the Help & Support section', description = '') {
    notification[type]({
      message,
      description,
      duration: 7,
      onClick: () => {}
    });
  }

  loadMoreErrors (logOrder) {
    const combinedLogs = this.state.combinedLogs || [];
    if (combinedLogs.length > 0 && logOrder === 'latest') {
      const logId = combinedLogs[combinedLogs.length - 1].id;
      this.getConsoleCombinedLogs({ logOrder, logId });
    }
    if (combinedLogs.length > 0 && logOrder === 'old') {
      const logId = combinedLogs[0].id;
      this.getConsoleCombinedLogs({ logOrder, logId });
    }
  }

  handleAllPanel () {
    const combinedLogs = this.state.combinedLogs || [];
    const activeKeys = this.state.activeKeys || [];
    if (combinedLogs.length > 0 && activeKeys.length === 0) {
      const logIds = combinedLogs.map(log => log.id);
      this.setState({
        activeKeys: logIds
      });
    } else if (combinedLogs.length > 0 && activeKeys.length > 0) {
      this.setState({
        activeKeys: []
      });
    }
  }

  handlePanelChange (keys) {
    this.setState({
      activeKeys: keys
    });
  }

  openLogDetailsModal (logId, details) {
    if (logId && details.hostname && details.pid && details.source && details.level) {
      this.setState({
        activeLogId: logId,
        activeLogDetails: details,
        logDetailsModalStatus: true
      });
    } else {
      message.error('Log details not available');
    }
  }

  closeLogDetailsModal () {
    this.setState({
      activeLogId: null,
      activeLogDetails: {},
      logDetailsModalStatus: false
    });
  }

  openLogMetaModal (logId, meta) {
    if (logId && meta) {
      this.setState({
        activeLogId: logId,
        activeLogMeta: meta,
        metaModalStatus: true
      });
    }
  }

  closeLogMetaModal () {
    this.setState({
      activeLogId: null,
      activeLogMeta: null,
      metaModalStatus: false
    });
  }

  render () {
    const consoleCombinedLogLoading = this.state.consoleCombinedLogLoading || false;
    const combinedLogs = this.state.combinedLogs || [];
    const timezone = this.state.timezone || 'Local';
    const activeKeys = this.state.activeKeys || [];
    const errorLogId = this.state.errorLogId || null;
    const activeLogId = this.state.activeLogId || null;
    const activeLogDetails = this.state.activeLogDetails || {};
    const activeLogMeta = this.state.activeLogMeta || null;
    const logDetailsModalStatus = this.state.logDetailsModalStatus || false;
    const metaModalStatus = this.state.metaModalStatus || false;

    const renderConsoleCombinedLogs = () => {
      return combinedLogs.map((log) => {
        const message = log.attributes.message;
        const hostname = log.attributes.hostname || 'N/A';
        const pid = log.attributes.pid || 'N/A';
        const source = log.attributes.source || 'N/A';
        const level = log.attributes.level;
        const meta = log.attributes.meta;
        let occurredAt = log.attributes.timestamp;
        const logId = log.id;

        occurredAt = timezone === 'Local' ? moment(occurredAt).format('YYYY-MM-DD HH:mm:ss Z') : moment.utc(occurredAt).format('YYYY-MM-DD HH:mm:ss Z');

        let header;
        if (level === 'error' || level === 'alert') {
          header = <p className='log_panel_header main-combined-logs'><span className='log_timestamp'>{occurredAt}</span><span className='log_message_top' style={{ color: '#db4e09' }}>{message}</span></p>;
        } else {
          header = <p className='log_panel_header main-combined-logs'><span className='log_timestamp'>{occurredAt}</span><span className='log_message_top'>{message}</span></p>;
        }

        let selectedError = false;
        if (errorLogId === logId) {
          selectedError = true;
        }

        const menu = (
          <Menu>
            {meta && meta !== '{}' &&
              <Menu.Item key='1' onClick={this.openLogMetaModal.bind(this, logId, meta)}>
                View Meta
              </Menu.Item>}
            <Menu.Item key='2' onClick={this.openLogDetailsModal.bind(this, logId, { hostname, pid, source, level })}>
              View Details
            </Menu.Item>
          </Menu>
        );

        const panel = <Panel className={selectedError ? 'log_panel selected_error_log_panel' : 'log_panel'} header={header} key={logId} extra={<span className='view-log-extra' onClick={event => { event.stopPropagation(); }}><Dropdown overlay={menu} className='view-log-details'><Button type='primary'><Icon type='more' /></Button></Dropdown></span>}><pre className='log_message_detail'>{message}</pre></Panel>;

        return panel;
      });
    };

    const showMeta = () => {
      if (activeLogMeta) {
        try {
          const parsedObject = JSON.parse(activeLogMeta);
          if (typeof parsedObject === 'object') {
            return <ReactJson src={parsedObject} name={false} collapsed={3} displayDataTypes={false} displayObjectSize={false} enableClipboard={false} />;
          } else {
            return <pre>{activeLogMeta}</pre>;
          }
        } catch (e) {
          return <pre>{activeLogMeta}</pre>;
        }
      } else {
        return 'No details available';
      }
    };

    const antIcon = <Icon type='loading' style={{ fontSize: 30 }} spin />;

    return (
      <>
        <Spin indicator={antIcon} spinning={consoleCombinedLogLoading} delay={100}>
          <Content>
            <div className='filter_sort console_log_content'>
              <div className='content-box'><p className='header'><Icon className='header_col_icon' onClick={this.handleAllPanel.bind(this)} type={activeKeys.length > 0 ? 'down' : 'right'} /><span className='header_col_1'>Timestamp</span><span className='header_col_2'>Message</span></p>
                {combinedLogs.length !== 0 &&
                  <Collapse activeKey={activeKeys} onChange={this.handlePanelChange.bind(this)}>
                    <p className='logs_more'>There maybe older logs to load. <a onClick={this.loadMoreErrors.bind(this, 'old')}>Load More</a> </p>
                    {renderConsoleCombinedLogs()}
                    <p className='logs_more'>There maybe newer logs to load. <a onClick={this.loadMoreErrors.bind(this, 'latest')}>Load More</a> </p>
                  </Collapse>}
                {combinedLogs.length === 0 && <div className='ant-empty ant-empty-normal'><div className='ant-empty-image'><svg width='64' height='41' viewBox='0 0 64 41' xmlns='http://www.w3.org/2000/svg'><g transform='translate(0 1)' fill='none' fillRule='evenodd'><ellipse fill='#F5F5F5' cx='32' cy='33' rx='32' ry='7' /><g fillRule='nonzero' stroke='#D9D9D9'><path d='M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z' /><path d='M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z' fill='#FAFAFA' /></g></g></svg></div><p className='ant-empty-description'>No Data</p></div>}
              </div>
            </div>
          </Content>
          <Modal className='view-log-meta-modal' width='90%' centered closable maskClosable footer={null} visible={metaModalStatus} onCancel={this.closeLogMetaModal.bind(this, null)} destroyOnClose>
            <div className='log-meta-div'>{showMeta()}</div>
          </Modal>
          <Modal className='view-log-details-modal' width='60%' centered closable maskClosable footer={null} visible={logDetailsModalStatus} onCancel={this.closeLogDetailsModal.bind(this, activeLogId)} destroyOnClose>
            <Descriptions title='Log Details' bordered>
              <Descriptions.Item label='Hostname' span={3}>{activeLogDetails.hostname}</Descriptions.Item>
              <Descriptions.Item label='PID' span={3}>{activeLogDetails.pid}</Descriptions.Item>
              <Descriptions.Item label='Source' span={3}>{activeLogDetails.source}</Descriptions.Item>
              <Descriptions.Item label='Level' span={3}>{activeLogDetails.level}</Descriptions.Item>
            </Descriptions>
          </Modal>
        </Spin>
      </>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ConsoleCombinedLogs);
