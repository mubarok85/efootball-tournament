import {
  supabase
} from '../lib/supabase'

import './AdminAccessStatus.css'


function AdminAccessStatus({
  profile,
  onRefresh
}) {
  const status =
    profile
      ?.approval_status
    ||
    'pending'


  const statusCopy = {
    pending: {
      title:
        'Approval Pending',

      description:
        'Your registration was successful. The Super Admin must approve your account before you can enter the administration portal.'
    },

    rejected: {
      title:
        'Access Request Rejected',

      description:
        'Your administrator request was not approved. Contact the Super Admin if you believe this should be reviewed.'
    },

    revoked: {
      title:
        'Admin Access Revoked',

      description:
        'Your administrator access has been disabled by the Super Admin.'
    }
  }


  const content =
    statusCopy[
      status
    ]
    ||
    statusCopy.pending


  async function signOut() {
    await supabase
      .auth
      .signOut()
  }


  return (
    <main className="admin-status-page">

      <section className="admin-status-card">

        <div className="admin-status-icon">
          ⏳
        </div>


        <p>
          PESLOVER ADMIN
        </p>

        <h1>
          {content.title}
        </h1>

        <span>
          {content.description}
        </span>


        <div className="admin-status-account">

          <span>
            Account
          </span>

          <strong>
            {
              profile?.email
              ||
              'Administrator'
            }
          </strong>


          <span>
            Status
          </span>

          <strong className="status-value">
            {status}
          </strong>

        </div>


        {status ===
          'pending' && (
          <button
            type="button"
            className="admin-status-refresh"
            onClick={
              onRefresh
            }
          >
            Check Approval Status
          </button>
        )}


        <button
          type="button"
          className="admin-status-signout"
          onClick={
            signOut
          }
        >
          Sign Out
        </button>

      </section>

    </main>
  )
}


export default AdminAccessStatus
