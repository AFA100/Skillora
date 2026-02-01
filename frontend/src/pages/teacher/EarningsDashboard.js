import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teacherAPI } from '../../services/api';
import './EarningsDashboard.css';

const EarningsDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submittingPayout, setSubmittingPayout] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getEarningsDashboard();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    
    if (!payoutAmount || parseFloat(payoutAmount) < 10) {
      alert('Minimum payout amount is $10.00');
      return;
    }

    try {
      setSubmittingPayout(true);
      await teacherAPI.createPayoutRequest({ amount: payoutAmount });
      setShowPayoutForm(false);
      setPayoutAmount('');
      fetchDashboardData(); // Refresh data
      alert('Payout request submitted successfully!');
    } catch (error) {
      console.error('Error submitting payout request:', error);
      alert(error.response?.data?.error || 'Failed to submit payout request');
    } finally {
      setSubmittingPayout(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading earnings dashboard...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const { earnings_summary, recent_transactions, pending_payouts, monthly_earnings, has_bank_account, bank_account_verified } = dashboardData;

  return (
    <div className="earnings-dashboard">
      <div className="dashboard-header">
        <h1>Earnings Dashboard</h1>
        <div className="header-actions">
          {!has_bank_account ? (
            <Link to="/teacher/bank-account" className="btn-primary">
              Add Bank Account
            </Link>
          ) : !bank_account_verified ? (
            <div className="verification-notice">
              <span>Bank account pending verification</span>
            </div>
          ) : (
            <button 
              onClick={() => setShowPayoutForm(true)}
              className="btn-primary"
              disabled={parseFloat(earnings_summary.pending_balance) < 10}
            >
              Request Payout
            </button>
          )}
        </div>
      </div>

      {/* Earnings Summary Cards */}
      <div className="earnings-summary">
        <div className="summary-card">
          <div className="card-header">
            <h3>Total Revenue</h3>
            <span className="card-icon">💰</span>
          </div>
          <div className="card-value">
            {formatCurrency(earnings_summary.total_gross_revenue)}
          </div>
          <div className="card-subtitle">Gross earnings from all sales</div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Net Earnings</h3>
            <span className="card-icon">📈</span>
          </div>
          <div className="card-value">
            {formatCurrency(earnings_summary.total_net_earnings)}
          </div>
          <div className="card-subtitle">
            After {earnings_summary.commission_rate}% platform fee
          </div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Pending Balance</h3>
            <span className="card-icon">⏳</span>
          </div>
          <div className="card-value">
            {formatCurrency(earnings_summary.pending_balance)}
          </div>
          <div className="card-subtitle">Available for payout</div>
        </div>

        <div className="summary-card">
          <div className="card-header">
            <h3>Total Paid Out</h3>
            <span className="card-icon">✅</span>
          </div>
          <div className="card-value">
            {formatCurrency(earnings_summary.total_paid_out)}
          </div>
          <div className="card-subtitle">Successfully withdrawn</div>
        </div>
      </div>

      {/* Monthly Earnings Chart */}
      <div className="chart-section">
        <h2>Monthly Earnings (Last 12 Months)</h2>
        <div className="earnings-chart">
          {monthly_earnings.map((month, index) => (
            <div key={index} className="chart-bar">
              <div 
                className="bar-fill" 
                style={{ 
                  height: `${Math.max(5, (month.earnings / Math.max(...monthly_earnings.map(m => m.earnings))) * 100)}%` 
                }}
              />
              <div className="bar-label">
                <div className="bar-month">{month.month}</div>
                <div className="bar-amount">{formatCurrency(month.earnings)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Recent Transactions */}
        <div className="transactions-section">
          <h2>Recent Transactions</h2>
          {recent_transactions.length === 0 ? (
            <div className="no-data">
              <p>No transactions yet. Start selling courses to see your earnings!</p>
            </div>
          ) : (
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Gross</th>
                    <th>Commission</th>
                    <th>Net</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_transactions.map(transaction => (
                    <tr key={transaction.id}>
                      <td>{transaction.course_title}</td>
                      <td>{formatCurrency(transaction.gross_amount)}</td>
                      <td>{formatCurrency(transaction.commission_amount)}</td>
                      <td className="net-amount">{formatCurrency(transaction.net_amount)}</td>
                      <td>{formatDate(transaction.payment_date)}</td>
                      <td>
                        <span className={`status ${transaction.is_paid_out ? 'paid' : 'pending'}`}>
                          {transaction.is_paid_out ? 'Paid Out' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Payouts */}
        <div className="payouts-section">
          <h2>Payout Requests</h2>
          {pending_payouts.length === 0 ? (
            <div className="no-data">
              <p>No pending payout requests.</p>
            </div>
          ) : (
            <div className="payouts-list">
              {pending_payouts.map(payout => (
                <div key={payout.id} className="payout-item">
                  <div className="payout-info">
                    <div className="payout-amount">{formatCurrency(payout.amount)}</div>
                    <div className="payout-date">Requested: {formatDate(payout.requested_at)}</div>
                  </div>
                  <div className="payout-status">
                    <span className={`status ${payout.status}`}>
                      {payout.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {payout.can_be_cancelled && (
                      <button 
                        className="btn-cancel"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to cancel this payout request?')) {
                            // Handle cancellation
                          }
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payout Request Modal */}
      {showPayoutForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Request Payout</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPayoutForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handlePayoutRequest}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Available Balance</label>
                  <div className="balance-display">
                    {formatCurrency(earnings_summary.pending_balance)}
                  </div>
                </div>
                <div className="form-group">
                  <label>Payout Amount *</label>
                  <input
                    type="number"
                    min="10"
                    step="0.01"
                    max={earnings_summary.pending_balance}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="Minimum $10.00"
                    required
                  />
                </div>
                <div className="payout-info">
                  <p>• Minimum payout amount: $10.00</p>
                  <p>• Processing time: 3-5 business days</p>
                  <p>• Funds will be transferred to your verified bank account</p>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  type="button" 
                  onClick={() => setShowPayoutForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingPayout}
                  className="btn-primary"
                >
                  {submittingPayout ? 'Submitting...' : 'Request Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsDashboard;